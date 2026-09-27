import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { checkDomainDns } from '@/lib/deliverability/dns-checker';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const domain = await prisma.domain.findUnique({
      where: { id: params.id },
    });

    if (!domain) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const selector = searchParams.get('selector') || 'google';

    const dnsResult = await checkDomainDns(domain.domainName, selector);

    const updated = await prisma.domain.update({
      where: { id: domain.id },
      data: {
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

    return NextResponse.json({ domain: updated, dnsResult });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'DNS verification failed' }, { status: 500 });
  }
}
