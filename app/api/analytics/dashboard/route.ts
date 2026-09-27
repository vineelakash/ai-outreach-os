import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('organizationId');

    const orgFilter = orgId ? { organizationId: orgId } : undefined;

    const [
      totalLeads,
      activeCampaigns,
      totalCampaigns,
      mailboxes,
      totalSentAgg,
      totalRepliesAgg,
      totalBouncesAgg,
      interestedThreads,
      meetingThreads,
      recentMessages,
      recentThreads,
    ] = await Promise.all([
      prisma.lead.count({ where: orgFilter }),
      prisma.campaign.count({ where: { ...orgFilter, status: 'ACTIVE' } }),
      prisma.campaign.count({ where: orgFilter }),
      prisma.mailbox.findMany({
        where: orgFilter,
        select: {
          id: true,
          email: true,
          displayName: true,
          status: true,
          dailyLimit: true,
          currentDaySent: true,
          totalSent: true,
          totalReplies: true,
          totalBounces: true,
        },
      }),
      prisma.mailbox.aggregate({
        where: orgFilter,
        _sum: { totalSent: true, totalReplies: true, totalBounces: true },
      }),
      prisma.emailThread.count({
        where: {
          ...(orgId ? { mailbox: { organizationId: orgId } } : {}),
          latestIntent: 'INTERESTED',
        },
      }),
      prisma.emailThread.count({
        where: {
          ...(orgId ? { mailbox: { organizationId: orgId } } : {}),
          latestIntent: 'MEETING_REQUEST',
        },
      }),
      prisma.emailThread.count({
        where: {
          ...(orgId ? { mailbox: { organizationId: orgId } } : {}),
          latestIntent: 'INTERESTED',
        },
      }),
      prisma.emailThread.count({
        where: {
          ...(orgId ? { mailbox: { organizationId: orgId } } : {}),
          latestIntent: 'MEETING_REQUEST',
        },
      }),
      prisma.emailMessage.findMany({
        where: {
          isOutbound: true,
          sentAt: { not: null },
          ...(orgId ? { mailbox: { organizationId: orgId } } : {}),
        },
        select: { sentAt: true },
        take: 500,
        orderBy: { sentAt: 'desc' },
      }),
      prisma.emailThread.findMany({
        where: orgId ? { mailbox: { organizationId: orgId } } : {},
        include: {
          lead: true,
          mailbox: true,
        },
        take: 5,
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    const totalSent = totalSentAgg._sum.totalSent || 0;
    const totalReplies = totalSentAgg._sum.totalReplies || 0;
    const totalBounces = totalSentAgg._sum.totalBounces || 0;

    const replyRate = totalSent > 0 ? ((totalReplies / totalSent) * 100).toFixed(1) : '0.0';
    const bounceRate = totalSent > 0 ? ((totalBounces / totalSent) * 100).toFixed(1) : '0.0';
    const positiveReplyRate = totalReplies > 0 ? ((interestedThreads / totalReplies) * 100).toFixed(1) : '0.0';

    // Mock/aggregate daily chart buckets for last 7 days
    const daysMap = new Map<string, { date: string; sent: number; replies: number }>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      daysMap.set(key, { date: key.slice(5), sent: 0, replies: 0 });
    }

    for (const msg of recentMessages) {
      if (msg.sentAt) {
        const key = msg.sentAt.toISOString().split('T')[0];
        if (daysMap.has(key)) {
          daysMap.get(key)!.sent += 1;
        }
      }
    }

    const chartTimeline = Array.from(daysMap.values());

    return NextResponse.json({
      metrics: {
        totalLeads,
        activeCampaigns,
        totalCampaigns,
        totalSent,
        totalReplies,
        totalBounces,
        interestedLeads: interestedThreads,
        meetingsBooked: meetingThreads,
        replyRate: `${replyRate}%`,
        bounceRate: `${bounceRate}%`,
        positiveReplyRate: `${positiveReplyRate}%`,
        activeMailboxes: mailboxes.filter((m) => m.status === 'ACTIVE').length,
        totalMailboxes: mailboxes.length,
      },
      chartTimeline,
      mailboxes,
      recentActivity: recentThreads.map((t) => ({
        id: t.id,
        type: t.latestIntent ? `Reply: ${t.latestIntent}` : 'Outbound outreach',
        contact: t.lead.fullName || t.lead.email,
        company: t.lead.company || 'Unknown',
        date: t.updatedAt,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch dashboard metrics' }, { status: 500 });
  }
}
