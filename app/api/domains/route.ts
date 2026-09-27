import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { checkDomainDns } from '@/lib/deliverability/dns-checker';
import { z } from 'zod';

const AddDomainSchema = z.object({
  domainName: z.string().min(3),
  organizationId: z.string(),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('organizationId');

    const domains = await prisma.domain.findMany({
      where: orgId ? { organizationId: orgId } : undefined,
      include: {
        mailboxes: {
          select: {
            id: true,
            email: true,
            totalSent: true,
            totalReplies: true,
            totalBounces: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ domains });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch domains' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = AddDomainSchema.parse(body);

    const cleanDomain = data.domainName.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');

    // Perform initial DNS inspection
    const dnsResult = await checkDomainDns(cleanDomain);

    const domain = await prisma.domain.create({
      data: {
        domainName: cleanDomain,
        organizationId: data.organizationId,
        spfRecord: dnsResult.spf.record,
        spfStatus: dnsResult.spf.valid,
        dkimRecord: dnsResult.dkim.record,
        dkimStatus: dnsResult.dkim.valid,
        dmarcRecord: dnsResult.dmarc.record,
        dmarcStatus: dnsResult.dmarc.valid,
        healthScore: dnsResult.healthScore,
        healthStatus: dnsResult.healthStatus,
        lastCheckedAt: new Date(),
      },
    });

    return NextResponse.json({ domain, dnsResult }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create domain' }, { status: 400 });
  }
}
