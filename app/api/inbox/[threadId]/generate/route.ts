import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getAIProvider } from '@/lib/ai/factory';

export async function POST(
  req: NextRequest,
  { params }: { params: { threadId: string } }
) {
  try {
    const thread = await prisma.emailThread.findUnique({
      where: { id: params.threadId },
      include: {
        lead: true,
        mailbox: true,
        campaign: true,
        messages: { orderBy: { createdAt: 'asc' }, take: 6 },
      },
    });

    if (!thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const customPrompt = body.prompt;

    const aiProvider = await getAIProvider(
      thread.mailbox.organizationId,
      thread.campaign?.aiProvider,
      thread.campaign?.aiModel
    );

    const history = thread.messages.map((m) => ({
      isOutbound: m.isOutbound,
      sender: m.fromEmail,
      body: m.bodyText,
      date: m.sentAt || m.createdAt,
    }));

    const draft = await aiProvider.generateReply(
      {
        subject: thread.subject,
        leadEmail: thread.lead.email,
        history,
      },
      customPrompt
    );

    return NextResponse.json({ draft });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to generate AI reply' }, { status: 500 });
  }
}
