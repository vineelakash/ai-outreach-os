import { NextRequest, NextResponse } from 'next/server';
import { OpenAIProvider } from '@/lib/ai/openai.provider';
import { GeminiProvider } from '@/lib/ai/gemini.provider';
import { AnthropicProvider } from '@/lib/ai/anthropic.provider';
import { MockAIProvider } from '@/lib/ai/mock.provider';
import { z } from 'zod';

const TestAiSchema = z.object({
  provider: z.enum(['OPENAI', 'GEMINI', 'ANTHROPIC', 'MOCK']),
  apiKey: z.string().optional(),
  model: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = TestAiSchema.parse(body);

    let providerInstance;
    switch (data.provider) {
      case 'OPENAI':
        if (!data.apiKey) throw new Error('API key is required for OpenAI test');
        providerInstance = new OpenAIProvider(data.apiKey, data.model || 'gpt-4o-mini');
        break;
      case 'GEMINI':
        if (!data.apiKey) throw new Error('API key is required for Gemini test');
        providerInstance = new GeminiProvider(data.apiKey, data.model || 'gemini-1.5-flash');
        break;
      case 'ANTHROPIC':
        if (!data.apiKey) throw new Error('API key is required for Anthropic test');
        providerInstance = new AnthropicProvider(data.apiKey, data.model || 'claude-3-5-haiku-20241022');
        break;
      default:
        providerInstance = new MockAIProvider();
    }

    const isConnected = await providerInstance.testConnection();
    return NextResponse.json({ success: isConnected });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Connection test failed' }, { status: 400 });
  }
}
