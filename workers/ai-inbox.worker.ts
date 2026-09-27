import { Job, Worker } from 'bullmq';
import { redisConnection } from '@/lib/queue/redis';
import { AI_REPLY_QUEUE } from '@/lib/queue/queues';
import { prisma } from '@/lib/db/prisma';
import { getAIProvider } from '@/lib/ai/factory';
import { getEmailProviderForMailbox } from '@/lib/email/factory';

export interface AIReplyJobData {
  threadId: string;
  incomingBody: string;
  mailboxId: string;
  leadId: string;
}

export async function processAIReplyJob(job: Job<AIReplyJobData>): Promise<void> {
  const { threadId, incomingBody, mailboxId, leadId } = job.data;

  const thread = await prisma.emailThread.findUnique({
    where: { id: threadId },
    include: {
      campaign: true,
      mailbox: true,
      lead: true,
      messages: { orderBy: { createdAt: 'asc' }, take: 6 },
    },
  });

  if (!thread) return;

  const orgId = thread.mailbox.organizationId;
  const aiProvider = await getAIProvider(
    orgId,
    thread.campaign?.aiProvider,
    thread.campaign?.aiModel
  );

  const history = thread.messages.map((m) => ({
    isOutbound: m.isOutbound,
    sender: m.fromEmail,
    body: m.bodyText,
    date: m.sentAt || m.createdAt,
  }));

  try {
    const classification = await aiProvider.classifyReply(incomingBody, {
      subject: thread.subject,
      leadEmail: thread.lead.email,
      history,
    });

    // Save structured classification to DB
    const record = await prisma.replyClassification.create({
      data: {
        threadId: thread.id,
        intent: classification.intent as any,
        confidence: classification.confidence,
        summary: classification.summary,
        recommendedAction: classification.recommendedAction,
        draftReply: classification.draftReply,
        autoSent: false,
      },
    });

    // Update thread's latest intent
    await prisma.emailThread.update({
      where: { id: thread.id },
      data: {
        latestIntent: classification.intent as any,
      },
    });

    // Update lead status based on classification
    if (classification.intent === 'UNSUBSCRIBE') {
      await prisma.lead.update({
        where: { id: leadId },
        data: {
          unsubscribed: true,
          status: 'UNSUBSCRIBED',
        },
      });
    } else if (classification.intent === 'INTERESTED') {
      await prisma.lead.update({
        where: { id: leadId },
        data: { status: 'INTERESTED' },
      });
    } else if (classification.intent === 'MEETING_REQUEST') {
      await prisma.lead.update({
        where: { id: leadId },
        data: { status: 'MEETING_BOOKED' },
      });
    }

    // Safety checks for automatic sending
    const isUnsafeForAutoSend =
      classification.intent === 'UNSUBSCRIBE' ||
      classification.intent === 'OTHER' ||
      classification.confidence < 0.85;

    const campaign = thread.campaign;
    if (
      campaign &&
      campaign.replyAutomationMode === 'AUTOMATIC' &&
      !isUnsafeForAutoSend &&
      classification.draftReply
    ) {
      // Automatic reply mode: send the AI-generated draft
      const emailProvider = await getEmailProviderForMailbox(mailboxId);
      const sendResult = await emailProvider.sendEmail({
        to: thread.lead.email,
        from: thread.mailbox.email,
        fromName: thread.mailbox.displayName,
        subject: `Re: ${thread.subject}`,
        bodyText: classification.draftReply,
        inReplyTo: thread.id,
      });

      if (sendResult.success) {
        await prisma.emailMessage.create({
          data: {
            threadId: thread.id,
            mailboxId: thread.mailboxId,
            fromEmail: thread.mailbox.email,
            fromName: thread.mailbox.displayName,
            toEmail: thread.lead.email,
            subject: `Re: ${thread.subject}`,
            bodyText: classification.draftReply,
            isOutbound: true,
            sentAt: new Date(),
          },
        });

        await prisma.replyClassification.update({
          where: { id: record.id },
          data: { autoSent: true },
        });

        console.log(`[AI_AUTO_REPLY_SENT] Automatically replied to ${thread.lead.email}`);
      }
    }
  } catch (err) {
    console.error('[AI_INBOX_PROCESS_ERROR]', err);
  }
}

export function createAIInboxWorker(): Worker<AIReplyJobData> {
  return new Worker<AIReplyJobData>(AI_REPLY_QUEUE, processAIReplyJob, {
    connection: redisConnection,
    concurrency: 3,
  });
}
