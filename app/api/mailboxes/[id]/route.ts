import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();

    const mailbox = await prisma.mailbox.update({
      where: { id: params.id },
      data: {
        displayName: body.displayName,
        dailyLimit: body.dailyLimit,
        status: body.status,
      },
    });

    return NextResponse.json({ mailbox });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update mailbox' }, { status: 400 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.mailbox.delete({
      where: { id: params.id },
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete mailbox' }, { status: 500 });
  }
}
