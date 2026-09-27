import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getEmailProviderForMailbox } from '@/lib/email/factory';
import { z } from 'zod';

const SendReplySchema = z.object({
  bodyText: z.string().min(1),
  subject: z.string().optional(),
});

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
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    if (!thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }

    const body = await req.json();
    const data = SendReplySchema.parse(body);

    const provider = await getEmailProviderForMailbox(thread.mailboxId);
    const lastMsg = thread.messages[0];

    const replySubject = data.subject || (thread.subject.startsWith('Re:') ? thread.subject : `Re: ${thread.subject}`);

    const sendResult = await provider.sendEmail({
      to: thread.lead.email,
      toName: thread.lead.fullName || undefined,
      from: thread.mailbox.email,
      fromName: thread.mailbox.displayName,
      subject: replySubject,
      bodyText: data.bodyText,
      inReplyTo: lastMsg?.messageIdHeader || thread.externalThreadId || undefined,
    });

    if (!sendResult.success) {
      return NextResponse.json({ error: sendResult.error || 'Failed to send reply' }, { status: 500 });
    }

    const message = await prisma.emailMessage.create({
      data: {
        threadId: thread.id,
        mailboxId: thread.mailboxId,
        fromEmail: thread.mailbox.email,
        fromName: thread.mailbox.displayName,
        toEmail: thread.lead.email,
        subject: replySubject,
        bodyText: data.bodyText,
        isOutbound: true,
        sentAt: new Date(),
      },
    });

    await prisma.emailThread.update({
      where: { id: thread.id },
      data: {
        snippet: data.bodyText.slice(0, 120),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, message });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to dispatch reply' }, { status: 400 });
  }
}
