import { Job, Worker } from 'bullmq';
import { redisConnection } from '@/lib/queue/redis';
import { MAILBOX_SYNC_QUEUE, aiReplyQueue } from '@/lib/queue/queues';
import { prisma } from '@/lib/db/prisma';
import { getEmailProviderForMailbox } from '@/lib/email/factory';

export interface MailboxSyncJobData {
  mailboxId: string;
}

export async function processMailboxSyncJob(job: Job<MailboxSyncJobData>): Promise<void> {
  const { mailboxId } = job.data;
  const mailbox = await prisma.mailbox.findUnique({
    where: { id: mailboxId },
  });

  if (!mailbox || mailbox.status !== 'ACTIVE') return;

  try {
    const provider = await getEmailProviderForMailbox(mailbox.id);
    const sinceDate = mailbox.lastSyncedAt || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const incomingMessages = await provider.fetchMessages({ since: sinceDate, limit: 30 });

    for (const msg of incomingMessages) {
      const senderEmail = msg.fromEmail.toLowerCase().trim();

      // Find matching lead in the same organization
      const lead = await prisma.lead.findUnique({
        where: {
          organizationId_email: {
            organizationId: mailbox.organizationId,
            email: senderEmail,
          },
        },
      });

      if (!lead) {
        // Unknown sender or internal email, skip auto-linking
        continue;
      }

      // Check if this inbound message was already recorded
      let thread = await prisma.emailThread.findFirst({
        where: {
          mailboxId: mailbox.id,
          leadId: lead.id,
        },
      });

      if (!thread) {
        thread = await prisma.emailThread.create({
          data: {
            mailboxId: mailbox.id,
            leadId: lead.id,
            subject: msg.subject,
            snippet: msg.bodyText.slice(0, 120),
            hasUnread: true,
          },
        });
      }

      const existingMsg = await prisma.emailMessage.findFirst({
        where: {
          threadId: thread.id,
          fromEmail: senderEmail,
          sentAt: msg.date,
        },
      });

      if (!existingMsg) {
        await prisma.emailMessage.create({
          data: {
            threadId: thread.id,
            mailboxId: mailbox.id,
            fromEmail: msg.fromEmail,
            fromName: msg.fromName,
            toEmail: mailbox.email,
            subject: msg.subject,
            bodyText: msg.bodyText,
            isOutbound: false,
            sentAt: msg.date,
          },
        });

        // Mark thread as unread
        await prisma.emailThread.update({
          where: { id: thread.id },
          data: {
            hasUnread: true,
            snippet: msg.bodyText.slice(0, 120),
          },
        });

        // Update Lead state to REPLIED and halt active campaign sequences
        await prisma.lead.update({
          where: { id: lead.id },
          data: { status: 'REPLIED' },
        });

        await prisma.campaignLead.updateMany({
          where: {
            leadId: lead.id,
            status: { in: ['QUEUED', 'CONTACTED'] },
          },
          data: { status: 'REPLIED' },
        });

        await prisma.mailbox.update({
          where: { id: mailbox.id },
          data: { totalReplies: { increment: 1 } },
        });

        // Dispatch AI intent classification and reply generation
        await aiReplyQueue.add('classify-reply', {
          threadId: thread.id,
          incomingBody: msg.bodyText,
          mailboxId: mailbox.id,
          leadId: lead.id,
        });

        console.log(`[SYNC_DETECTED_REPLY] Detected incoming reply from ${lead.email}`);
      }
    }

    await prisma.mailbox.update({
      where: { id: mailbox.id },
      data: { lastSyncedAt: new Date() },
    });
  } catch (err: unknown) {
    console.error(`[SYNC_ERROR] Failed syncing mailbox ${mailbox.email}:`, err);
  }
}

export function createMailboxSyncerWorker(): Worker<MailboxSyncJobData> {
  return new Worker<MailboxSyncJobData>(MAILBOX_SYNC_QUEUE, processMailboxSyncJob, {
    connection: redisConnection,
    concurrency: 3,
  });
}
