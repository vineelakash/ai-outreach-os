import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';

const CreateCampaignSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  organizationId: z.string(),
  timezone: z.string().default('America/New_York'),
  startHour: z.number().min(0).max(23).default(9),
  endHour: z.number().min(0).max(23).default(17),
  allowedDays: z.array(z.number()).default([1, 2, 3, 4, 5]),
  dailyLimit: z.number().min(1).default(100),
  minDelaySeconds: z.number().min(10).default(120),
  maxDelaySeconds: z.number().min(10).default(300),
  replyAutomationMode: z.enum(['MANUAL', 'SEMI_AUTOMATIC', 'AUTOMATIC']).default('MANUAL'),
  stopOnReply: z.boolean().default(true),
  stopOnBounce: z.boolean().default(true),
  trackOpens: z.boolean().default(false),
  trackClicks: z.boolean().default(false),
  aiProvider: z.enum(['OPENAI', 'GEMINI', 'ANTHROPIC', 'MOCK']).default('OPENAI'),
  aiModel: z.string().default('gpt-4o-mini'),
  aiPromptInstructions: z.string().optional(),
  mailboxIds: z.array(z.string()).default([]),
  steps: z.array(
    z.object({
      stepNumber: z.number(),
      delayDays: z.number().default(1),
      subject: z.string().min(1),
      body: z.string().min(1),
      enableAiPersonalize: z.boolean().default(false),
    })
  ).min(1),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('organizationId');

    const campaigns = await prisma.campaign.findMany({
      where: orgId ? { organizationId: orgId } : undefined,
      include: {
        campaignMailboxes: {
          include: { mailbox: { select: { id: true, email: true, displayName: true, status: true } } },
        },
        sequences: {
          include: { steps: { orderBy: { stepNumber: 'asc' } } },
        },
        _count: {
          select: { campaignLeads: true, emailThreads: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ campaigns });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch campaigns' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = CreateCampaignSchema.parse(body);

    const campaign = await prisma.campaign.create({
      data: {
        name: validated.name,
        description: validated.description,
        organizationId: validated.organizationId,
        timezone: validated.timezone,
        startHour: validated.startHour,
        endHour: validated.endHour,
        allowedDays: validated.allowedDays,
        dailyLimit: validated.dailyLimit,
        minDelaySeconds: validated.minDelaySeconds,
        maxDelaySeconds: validated.maxDelaySeconds,
        replyAutomationMode: validated.replyAutomationMode,
        stopOnReply: validated.stopOnReply,
        stopOnBounce: validated.stopOnBounce,
        trackOpens: validated.trackOpens,
        trackClicks: validated.trackClicks,
        aiProvider: validated.aiProvider,
        aiModel: validated.aiModel,
        aiPromptInstructions: validated.aiPromptInstructions,
        status: 'DRAFT',
        campaignMailboxes: {
          create: validated.mailboxIds.map((mailboxId) => ({ mailboxId })),
        },
        sequences: {
          create: {
            steps: {
              create: validated.steps.map((s) => ({
                stepNumber: s.stepNumber,
                delayDays: s.delayDays,
                subject: s.subject,
                body: s.body,
                enableAiPersonalize: s.enableAiPersonalize,
              })),
            },
          },
        },
      },
      include: {
        campaignMailboxes: true,
        sequences: { include: { steps: true } },
      },
    });

    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create campaign' }, { status: 400 });
  }
}
