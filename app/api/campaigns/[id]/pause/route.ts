import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const campaign = await prisma.campaign.update({
      where: { id: params.id },
      data: { status: 'PAUSED' },
    });

    return NextResponse.json({
      success: true,
      message: `Campaign "${campaign.name}" paused.`,
      campaign,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to pause campaign' }, { status: 500 });
  }
}
