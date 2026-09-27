import { NextRequest, NextResponse } from 'next/server';
import { getAIProvider } from '@/lib/ai/factory';
import { z } from 'zod';

const GenerateSequenceSchema = z.object({
  productOrService: z.string().min(2),
  targetAudience: z.string().min(2),
  valueProposition: z.string().min(5),
  tone: z.string().optional(),
  callToAction: z.string().optional(),
  organizationId: z.string().optional(),
  provider: z.enum(['OPENAI', 'GEMINI', 'ANTHROPIC', 'MOCK']).optional(),
  model: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = GenerateSequenceSchema.parse(body);

    const aiProvider = await getAIProvider(data.organizationId, data.provider, data.model);
    const steps = await aiProvider.generateCampaignCopy({
      productOrService: data.productOrService,
      targetAudience: data.targetAudience,
      valueProposition: data.valueProposition,
      tone: data.tone,
      callToAction: data.callToAction,
    });

    return NextResponse.json({ steps });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to generate copy' }, { status: 500 });
  }
}
