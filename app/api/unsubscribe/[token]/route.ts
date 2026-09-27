import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const leadId = params.token;

  try {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (lead) {
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          unsubscribed: true,
          status: 'UNSUBSCRIBED',
        },
      });

      // Halt active campaign leads
      await prisma.campaignLead.updateMany({
        where: {
          leadId: lead.id,
          status: { in: ['QUEUED', 'CONTACTED'] },
        },
        data: { status: 'UNSUBSCRIBED' },
      });
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Unsubscribed Successfully</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { background: #1e293b; padding: 2.5rem; border-radius: 12px; border: 1px solid #334155; text-align: center; max-width: 480px; }
            h1 { font-size: 1.5rem; margin-bottom: 0.75rem; color: #38bdf8; }
            p { color: #94a3b8; line-height: 1.6; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Unsubscribed Successfully</h1>
            <p>Your email address <strong>${lead?.email || ''}</strong> has been permanently removed from our outreach list.</p>
            <p>You will receive no further automated communications from this sender.</p>
          </div>
        </body>
      </html>
    `;

    return new NextResponse(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to process unsubscribe' }, { status: 500 });
  }
}

// Support RFC 8058 One-Click Unsubscribe (POST request from email clients like Gmail)
export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const leadId = params.token;
  try {
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        unsubscribed: true,
        status: 'UNSUBSCRIBED',
      },
    });

    await prisma.campaignLead.updateMany({
      where: {
        leadId,
        status: { in: ['QUEUED', 'CONTACTED'] },
      },
      data: { status: 'UNSUBSCRIBED' },
    });

    return NextResponse.json({ success: true, message: 'Unsubscribed' });
  } catch {
    return NextResponse.json({ error: 'Failed to process one-click unsubscribe' }, { status: 500 });
  }
}
