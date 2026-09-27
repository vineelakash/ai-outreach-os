import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const { searchParams } = new URL(req.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  if (process.env.ENABLE_CLICK_TRACKING === 'true' && params.token) {
    try {
      const emailMessage = await prisma.emailMessage.findFirst({
        where: {
          OR: [{ id: params.token }, { thread: { leadId: params.token } }],
        },
      });

      if (emailMessage) {
        if (!emailMessage.clickedAt) {
          await prisma.emailMessage.update({
            where: { id: emailMessage.id },
            data: { clickedAt: new Date() },
          });
        }

        await prisma.trackingEvent.create({
          data: {
            emailMessageId: emailMessage.id,
            eventType: 'CLICK',
            targetUrl,
            ipAddress: req.headers.get('x-forwarded-for') || undefined,
            userAgent: req.headers.get('user-agent') || undefined,
          },
        });
      }
    } catch (err) {
      console.error('[CLICK_TRACK_ERROR]', err);
    }
  }

  return NextResponse.redirect(targetUrl);
}
