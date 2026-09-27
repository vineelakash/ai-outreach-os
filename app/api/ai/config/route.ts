import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { encrypt, maskSecret, decrypt } from '@/lib/security/crypto';
import { z } from 'zod';

const SaveAiConfigSchema = z.object({
  organizationId: z.string(),
  provider: z.enum(['OPENAI', 'GEMINI', 'ANTHROPIC']),
  apiKey: z.string().min(5),
  defaultModel: z.string().min(1),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('organizationId');

    const configs = await prisma.aIProviderConfig.findMany({
      where: orgId ? { organizationId: orgId } : undefined,
    });

    const safeConfigs = configs.map((c) => {
      let maskedKey = '••••••••';
      try {
        const decrypted = decrypt(c.encryptedApiKey);
        maskedKey = maskSecret(decrypted);
      } catch {
        maskedKey = '••••••••';
      }

      return {
        id: c.id,
        provider: c.provider,
        defaultModel: c.defaultModel,
        isEnabled: c.isEnabled,
        maskedKey,
        tokensUsed: c.tokensUsed,
        costEstimated: c.costEstimated,
      };
    });

    return NextResponse.json({ configs: safeConfigs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to load AI configs' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = SaveAiConfigSchema.parse(body);

    const encryptedApiKey = encrypt(data.apiKey);

    const config = await prisma.aIProviderConfig.upsert({
      where: {
        organizationId_provider: {
          organizationId: data.organizationId,
          provider: data.provider,
        },
      },
      create: {
        organizationId: data.organizationId,
        provider: data.provider,
        encryptedApiKey,
        defaultModel: data.defaultModel,
        isEnabled: true,
      },
      update: {
        encryptedApiKey,
        defaultModel: data.defaultModel,
        isEnabled: true,
      },
    });

    return NextResponse.json({
      success: true,
      config: {
        id: config.id,
        provider: config.provider,
        defaultModel: config.defaultModel,
        maskedKey: maskSecret(data.apiKey),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to save AI config' }, { status: 400 });
  }
}
