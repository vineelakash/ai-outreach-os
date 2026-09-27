import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('organizationId');
    const filter = searchParams.get('filter') || 'ALL'; // ALL, UNREAD, INTERESTED, MEETINGS, NEEDS_REPLY, UNSUBSCRIBED

    const where: any = {};
    if (orgId) {
      where.mailbox = { organizationId: orgId };
    }

    if (filter === 'UNREAD') {
      where.hasUnread = true;
    } else if (filter === 'INTERESTED') {
      where.latestIntent = 'INTERESTED';
    } else if (filter === 'MEETINGS') {
      where.latestIntent = 'MEETING_REQUEST';
    } else if (filter === 'NEEDS_REPLY') {
      where.latestIntent = { in: ['INTERESTED', 'QUESTION', 'NEEDS_MORE_INFORMATION', 'MEETING_REQUEST'] };
    } else if (filter === 'UNSUBSCRIBED') {
      where.latestIntent = 'UNSUBSCRIBE';
    }

    const threads = await prisma.emailThread.findMany({
      where,
      include: {
        lead: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            fullName: true,
            company: true,
            jobTitle: true,
            status: true,
          },
        },
        mailbox: {
          select: { id: true, email: true, displayName: true },
        },
        campaign: {
          select: { id: true, name: true },
        },
        classifications: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({ threads });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch inbox threads' }, { status: 500 });
  }
}
