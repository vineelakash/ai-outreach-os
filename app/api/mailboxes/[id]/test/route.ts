import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getEmailProviderForMailbox } from '@/lib/email/factory';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const mailbox = await prisma.mailbox.findUnique({
      where: { id: params.id },
    });

    if (!mailbox) {
      return NextResponse.json({ error: 'Mailbox not found' }, { status: 404 });
    }

    const provider = await getEmailProviderForMailbox(mailbox.id);
    const testResult = await provider.testConnection();

    // Update status based on test result
    await prisma.mailbox.update({
      where: { id: mailbox.id },
      data: {
        status: testResult.success ? 'ACTIVE' : 'ERROR',
        errorMessage: testResult.error || null,
      },
    });

    return NextResponse.json({ testResult });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Connection test failed' }, { status: 500 });
  }
}
