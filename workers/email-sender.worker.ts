import { Job, Worker } from 'bullmq';
import { redisConnection } from '@/lib/queue/redis';
import { EMAIL_SEND_QUEUE, emailSendQueue } from '@/lib/queue/queues';
import { prisma } from '@/lib/db/prisma';
import { getEmailProviderForMailbox } from '@/lib/email/factory';
import { getAIProvider } from '@/lib/ai/factory';
import {
  interpolateTemplate,
  isWithinSendingWindow,
  getNextAvailableSendTime,
  getRandomJitterSeconds,
  generateIdempotencyKey,
} from '@/lib/campaigns/sequence-engine';
import { addDays } from 'date-fns';

export interface SendEmailJobData {
  campaignId: string;
  leadId: string;
  campaignLeadId: string;
  stepNumber: number;
}

export async function processSendEmailJob(job: Job<SendEmailJobData>): Promise<void> {
  const { campaignId, leadId, campaignLeadId, stepNumber } = job.data;

  // 1. Fetch Campaign and Lead Details
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      campaignMailboxes: {
        include: { mailbox: true },
      },
      sequences: {
        include: { steps: { orderBy: { stepNumber: 'asc' } } },
      },
    },
  });

  if (!campaign || campaign.status !== 'ACTIVE') {
    console.log(`[WORKER_SKIP] Campaign ${campaignId} is not active (status: ${campaign?.status})`);
    return;
  }

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
  });

  if (!lead) return;

  // 2. Strict Suppression & Condition Guards
  if (lead.unsubscribed || lead.bounced || lead.status === 'DO_NOT_CONTACT' || lead.status === 'UNSUBSCRIBED' || lead.status === 'BOUNCED') {
    console.log(`[WORKER_SUPPRESSED] Lead ${lead.email} is unsubscribed or bounced. Halting sequence.`);
    return;
  }

  if (campaign.stopOnReply && (lead.status === 'REPLIED' || lead.status === 'INTERESTED' || lead.status === 'MEETING_BOOKED')) {
    console.log(`[WORKER_STOP_ON_REPLY] Lead ${lead.email} has already replied. Sequence halted.`);
    return;
  }

  // 3. Timezone & Sending Window Validation
  const scheduleConfig = {
    timezone: campaign.timezone,
    startHour: campaign.startHour,
    endHour: campaign.endHour,
    allowedDays: campaign.allowedDays,
  };

  const now = new Date();
  if (!isWithinSendingWindow(scheduleConfig, now)) {
    const nextWindow = getNextAvailableSendTime(scheduleConfig, now);
    const delayMs = Math.max(1000, nextWindow.getTime() - now.getTime());
    console.log(`[WORKER_RESCHEDULE] Current time is outside campaign schedule. Rescheduling in ${Math.round(delayMs / 1000 / 60)} minutes.`);
    await emailSendQueue.add(
      'send-email',
      job.data,
      { delay: delayMs }
    );
    return;
  }

  // 4. Find Available Mailbox within Daily Quota
  const activeMailboxes = campaign.campaignMailboxes
    .map((cm) => cm.mailbox)
    .filter((m) => m.status === 'ACTIVE' && m.currentDaySent < m.dailyLimit);

  if (activeMailboxes.length === 0) {
    console.warn(`[WORKER_QUOTA_REACHED] All assigned mailboxes for campaign ${campaign.name} reached daily limit. Postponing.`);
    return;
  }

  // Round-robin or pick mailbox with lowest currentDaySent
  activeMailboxes.sort((a, b) => a.currentDaySent - b.currentDaySent);
  const selectedMailbox = activeMailboxes[0];

  // 5. Find Target Sequence Step
  const sequence = campaign.sequences[0];
  const step = sequence?.steps.find((s) => s.stepNumber === stepNumber);
  if (!step) {
    console.log(`[WORKER_SEQUENCE_COMPLETED] No step ${stepNumber} found. Campaign sequence finished for lead ${lead.email}.`);
    await prisma.campaignLead.update({
      where: { id: campaignLeadId },
      data: { status: 'COMPLETED' },
    });
    return;
  }

  // 6. Idempotency Check
  const idempotencyKey = generateIdempotencyKey(campaignLeadId, stepNumber);
  const existingMessage = await prisma.emailMessage.findUnique({
    where: { idempotencyKey },
  });

  if (existingMessage) {
    console.warn(`[WORKER_IDEMPOTENCY_SKIP] Step ${stepNumber} for lead ${lead.email} was already sent under key ${idempotencyKey}`);
    return;
  }

  // 7. AI Personalization (if enabled on step)
  let aiPersonalizationText = '';
  if (step.enableAiPersonalize) {
    try {
      const aiProvider = await getAIProvider(campaign.organizationId, campaign.aiProvider, campaign.aiModel);
      const personalized = await aiProvider.personalizeEmail(
        {
          firstName: lead.firstName,
          lastName: lead.lastName,
          company: lead.company,
          jobTitle: lead.jobTitle,
          industry: lead.industry,
          city: lead.city,
        },
        campaign.aiPromptInstructions || undefined
      );
      aiPersonalizationText = `${personalized.personalizedOpening} ${personalized.painPointHypothesis}`;
    } catch (err) {
      console.warn('[WORKER_AI_PERSONALIZE_FAILED] Proceeding with standard copy:', err);
    }
  }

  // 8. Template Interpolation
  const vars = {
    firstName: lead.firstName,
    lastName: lead.lastName,
    company: lead.company,
    jobTitle: lead.jobTitle,
    senderName: selectedMailbox.displayName,
    aiPersonalization: aiPersonalizationText,
  };

  const subject = interpolateTemplate(step.subject, vars);
  const bodyText = interpolateTemplate(step.body, vars);

  // 9. Unsubscribe & Tracking URLs
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const unsubscribeUrl = `${baseUrl}/api/unsubscribe/${lead.id}`;
  const trackingPixelUrl = campaign.trackOpens
    ? `${baseUrl}/api/track/open/${lead.id}.gif`
    : undefined;

  // 10. Send via Email Provider
  const provider = await getEmailProviderForMailbox(selectedMailbox.id);
  const sendResult = await provider.sendEmail({
    to: lead.email,
    toName: lead.fullName || undefined,
    from: selectedMailbox.email,
    fromName: selectedMailbox.displayName,
    subject,
    bodyText,
    trackingPixelUrl,
    unsubscribeUrl,
  });

  if (!sendResult.success) {
    console.error(`[WORKER_SEND_FAILED] Error sending to ${lead.email}: ${sendResult.error}`);
    throw new Error(`Email provider failed: ${sendResult.error}`);
  }

  // 11. Record In Database (Thread & EmailMessage)
  let thread = await prisma.emailThread.findFirst({
    where: {
      mailboxId: selectedMailbox.id,
      leadId: lead.id,
    },
  });

  if (!thread) {
    thread = await prisma.emailThread.create({
      data: {
        campaignId: campaign.id,
        mailboxId: selectedMailbox.id,
        leadId: lead.id,
        subject,
        snippet: bodyText.slice(0, 120),
      },
    });
  }

  await prisma.emailMessage.create({
    data: {
      threadId: thread.id,
      mailboxId: selectedMailbox.id,
      fromEmail: selectedMailbox.email,
      fromName: selectedMailbox.displayName,
      toEmail: lead.email,
      subject,
      bodyText,
      isOutbound: true,
      idempotencyKey,
      sentAt: new Date(),
    },
  });

  // Update Mailbox counters
  await prisma.mailbox.update({
    where: { id: selectedMailbox.id },
    data: {
      currentDaySent: { increment: 1 },
      totalSent: { increment: 1 },
    },
  });

  // Update Lead & CampaignLead states
  await prisma.lead.update({
    where: { id: lead.id },
    data: { status: 'CONTACTED' },
  });

  const nextStep = sequence.steps.find((s) => s.stepNumber === stepNumber + 1);
  if (nextStep) {
    const nextRun = addDays(new Date(), nextStep.delayDays);
    await prisma.campaignLead.update({
      where: { id: campaignLeadId },
      data: {
        currentStep: nextStep.stepNumber,
        lastSentAt: new Date(),
        nextRunAt: nextRun,
        status: 'CONTACTED',
      },
    });

    // Schedule next step job with delay
    const delayMs = Math.max(1000, nextRun.getTime() - Date.now());
    await emailSendQueue.add(
      'send-email',
      {
        campaignId,
        leadId,
        campaignLeadId,
        stepNumber: nextStep.stepNumber,
      },
      { delay: delayMs }
    );
  } else {
    await prisma.campaignLead.update({
      where: { id: campaignLeadId },
      data: {
        lastSentAt: new Date(),
        status: 'COMPLETED',
      },
    });
  }

  console.log(`[WORKER_SEND_SUCCESS] Sent step ${stepNumber} to ${lead.email} from ${selectedMailbox.email}`);
}

export function createEmailSenderWorker(): Worker<SendEmailJobData> {
  return new Worker<SendEmailJobData>(EMAIL_SEND_QUEUE, processSendEmailJob, {
    connection: redisConnection,
    concurrency: 5,
  });
}
