import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

// 1x1 Transparent GIF buffer (43 bytes)
const TRANSPARENT_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const token = params.token.replace(/\.gif$/, '');

  if (process.env.ENABLE_OPEN_TRACKING === 'true' && token) {
    try {
      const emailMessage = await prisma.emailMessage.findFirst({
        where: {
          OR: [{ id: token }, { thread: { leadId: token } }],
        },
      });

      if (emailMessage && !emailMessage.openedAt) {
        await prisma.emailMessage.update({
          where: { id: emailMessage.id },
          data: { openedAt: new Date() },
        });

        await prisma.trackingEvent.create({
          data: {
            emailMessageId: emailMessage.id,
            eventType: 'OPEN',
            ipAddress: req.headers.get('x-forwarded-for') || undefined,
            userAgent: req.headers.get('user-agent') || undefined,
          },
        });
      }
    } catch (err) {
      console.error('[OPEN_TRACK_ERROR]', err);
    }
  }

  return new NextResponse(TRANSPARENT_GIF, {
    status: 200,
    headers: {
      'Content-Type': 'image/gif',
      'Content-Length': String(TRANSPARENT_GIF.length),
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      Pragma: 'no-cache',
      Expires: '0',
    },
  });
}
