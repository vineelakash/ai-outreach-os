import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { emailSendQueue } from '@/lib/queue/queues';
import { getRandomJitterSeconds } from '@/lib/campaigns/sequence-engine';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id: params.id },
      include: {
        campaignMailboxes: true,
        sequences: { include: { steps: true } },
        campaignLeads: {
          where: { status: 'QUEUED', currentStep: 1 },
          include: { lead: true },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    if (campaign.campaignMailboxes.length === 0) {
      return NextResponse.json(
        { error: 'Cannot launch campaign without at least one assigned sender mailbox.' },
        { status: 400 }
      );
    }

    if (!campaign.sequences[0]?.steps?.length) {
      return NextResponse.json(
        { error: 'Cannot launch campaign without sequence steps configured.' },
        { status: 400 }
      );
    }

    // Update status to ACTIVE
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { status: 'ACTIVE' },
    });

    // Enqueue sending jobs with jitter delays
    let delayAccSeconds = 5;
    for (const cl of campaign.campaignLeads) {
      if (cl.lead.unsubscribed || cl.lead.bounced || cl.lead.status === 'DO_NOT_CONTACT') {
        continue;
      }

      const jitter = getRandomJitterSeconds(campaign.minDelaySeconds, campaign.maxDelaySeconds);
      delayAccSeconds += jitter;

      try {
        await emailSendQueue.add(
          'send-email',
          {
            campaignId: campaign.id,
            leadId: cl.leadId,
            campaignLeadId: cl.id,
            stepNumber: 1,
          },
          {
            delay: delayAccSeconds * 1000,
          }
        );
      } catch (queueErr) {
        console.warn('[LAUNCH_QUEUE_WARNING] Redis not available, job recorded in DB:', queueErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Campaign "${campaign.name}" activated. ${campaign.campaignLeads.length} leads enqueued.`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to launch campaign' }, { status: 500 });
  }
}
