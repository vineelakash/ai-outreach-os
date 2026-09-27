import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id: params.id },
      include: {
        campaignMailboxes: {
          include: { mailbox: true },
        },
        sequences: {
          include: { steps: { orderBy: { stepNumber: 'asc' } } },
        },
        campaignLeads: {
          take: 50,
          include: { lead: true },
        },
        _count: {
          select: { campaignLeads: true, emailThreads: true },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    return NextResponse.json({ campaign });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch campaign' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();

    const updated = await prisma.campaign.update({
      where: { id: params.id },
      data: {
        name: body.name,
        description: body.description,
        status: body.status,
        timezone: body.timezone,
        startHour: body.startHour,
        endHour: body.endHour,
        allowedDays: body.allowedDays,
        dailyLimit: body.dailyLimit,
        replyAutomationMode: body.replyAutomationMode,
        stopOnReply: body.stopOnReply,
        stopOnBounce: body.stopOnBounce,
        trackOpens: body.trackOpens,
        trackClicks: body.trackClicks,
        aiProvider: body.aiProvider,
        aiModel: body.aiModel,
        aiPromptInstructions: body.aiPromptInstructions,
      },
    });

    return NextResponse.json({ campaign: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update campaign' }, { status: 400 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.campaign.delete({
      where: { id: params.id },
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete campaign' }, { status: 500 });
  }
}
