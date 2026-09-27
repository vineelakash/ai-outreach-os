import { AIProvider } from './ai.interface';
import { OpenAIProvider } from './openai.provider';
import { GeminiProvider } from './gemini.provider';
import { AnthropicProvider } from './anthropic.provider';
import { MockAIProvider } from './mock.provider';
import { decrypt } from '@/lib/security/crypto';
import { prisma } from '@/lib/db/prisma';

export async function getAIProvider(
  organizationId?: string,
  preferredProvider?: 'OPENAI' | 'GEMINI' | 'ANTHROPIC' | 'MOCK',
  preferredModel?: string
): Promise<AIProvider> {
  const providerType = preferredProvider || (process.env.AI_PROVIDER?.toUpperCase() as any) || 'MOCK';

  // 1. If explicit organization config exists in DB, attempt to load it
  if (organizationId && providerType !== 'MOCK') {
    try {
      const config = await prisma.aIProviderConfig.findUnique({
        where: {
          organizationId_provider: {
            organizationId,
            provider: providerType,
          },
        },
      });

      if (config && config.isEnabled && config.encryptedApiKey) {
        const apiKey = decrypt(config.encryptedApiKey);
        const model = preferredModel || config.defaultModel;

        switch (providerType) {
          case 'OPENAI':
            return new OpenAIProvider(apiKey, model);
          case 'GEMINI':
            return new GeminiProvider(apiKey, model);
          case 'ANTHROPIC':
            return new AnthropicProvider(apiKey, model);
        }
      }
    } catch (err) {
      console.warn('[AI_FACTORY] Error fetching DB AI config, falling back to env:', err);
    }
  }

  // 2. Fall back to environment variables
  if (providerType === 'OPENAI' && process.env.OPENAI_API_KEY) {
    return new OpenAIProvider(process.env.OPENAI_API_KEY, preferredModel || 'gpt-4o-mini');
  }

  if (providerType === 'GEMINI' && process.env.GEMINI_API_KEY) {
    return new GeminiProvider(process.env.GEMINI_API_KEY, preferredModel || 'gemini-1.5-flash');
  }

  if (providerType === 'ANTHROPIC' && process.env.ANTHROPIC_API_KEY) {
    return new AnthropicProvider(process.env.ANTHROPIC_API_KEY, preferredModel || 'claude-3-5-haiku-20241022');
  }

  // 3. Fallback to Mock provider for local dev and testing
  return new MockAIProvider();
}
