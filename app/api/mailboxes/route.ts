import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { encrypt } from '@/lib/security/crypto';
import { createEmailProviderFromCredentials } from '@/lib/email/factory';
import { z } from 'zod';

const AddMailboxSchema = z.object({
  email: z.string().email(),
  displayName: z.string().min(1),
  organizationId: z.string(),
  providerType: z.enum(['SMTP_IMAP', 'GMAIL', 'MICROSOFT_GRAPH', 'MOCK']),
  dailyLimit: z.number().min(1).max(2000).default(50),
  domainName: z.string().optional(),
  credentials: z.record(z.unknown()),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('organizationId');

    const mailboxes = await prisma.mailbox.findMany({
      where: orgId ? { organizationId: orgId } : undefined,
      include: {
        domain: true,
        _count: {
          select: { emailMessages: true, campaignMailboxes: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Strip encryptedCredentials from client responses for security
    const sanitized = mailboxes.map((m) => {
      const { encryptedCredentials, ...rest } = m;
      return rest;
    });

    return NextResponse.json({ mailboxes: sanitized });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch mailboxes' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = AddMailboxSchema.parse(body);

    // 1. Encrypt credentials at rest using AES-256-GCM
    const encryptedCredentials = encrypt(JSON.stringify(data.credentials));

    // 2. Test connection with the provider adapter
    const provider = createEmailProviderFromCredentials(
      data.providerType,
      data.email,
      encryptedCredentials
    );

    const testResult = await provider.testConnection();

    // 3. Resolve or create domain if supplied
    let domainId: string | undefined;
    if (data.domainName) {
      const domain = await prisma.domain.upsert({
        where: { domainName: data.domainName.toLowerCase().trim() },
        create: {
          domainName: data.domainName.toLowerCase().trim(),
          organizationId: data.organizationId,
        },
        update: {},
      });
      domainId = domain.id;
    }

    // 4. Save to Database
    const mailbox = await prisma.mailbox.create({
      data: {
        email: data.email.toLowerCase().trim(),
        displayName: data.displayName,
        providerType: data.providerType,
        organizationId: data.organizationId,
        encryptedCredentials,
        dailyLimit: data.dailyLimit,
        domainId,
        status: testResult.success ? 'ACTIVE' : 'ERROR',
        errorMessage: testResult.error || undefined,
      },
    });

    return NextResponse.json(
      {
        mailbox: {
          id: mailbox.id,
          email: mailbox.email,
          displayName: mailbox.displayName,
          providerType: mailbox.providerType,
          status: mailbox.status,
          dailyLimit: mailbox.dailyLimit,
        },
        testResult,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to add mailbox' }, { status: 400 });
  }
}
