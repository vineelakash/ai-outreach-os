import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET(
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
        messages: {
          orderBy: { createdAt: 'asc' },
        },
        classifications: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }

    // Mark as read
    if (thread.hasUnread) {
      await prisma.emailThread.update({
        where: { id: thread.id },
        data: { hasUnread: false },
      });
    }

    return NextResponse.json({ thread });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch thread' }, { status: 500 });
  }
}
