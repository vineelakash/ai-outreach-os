import Anthropic from '@anthropic-ai/sdk';
import { AIProvider } from './ai.interface';
import {
  ReplyClassificationResult,
  ReplyClassificationSchema,
  PersonalizationOutput,
  PersonalizationOutputSchema,
  LeadContext,
  ThreadContext,
  GeneratedCopyParams,
  GeneratedSequenceStep,
} from './types';

export class AnthropicProvider implements AIProvider {
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model: string = 'claude-3-5-haiku-20241022') {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  private extractJson(text: string): string {
    const match = text.match(/\{[\s\S]*\}/);
    return match ? match[0] : text;
  }

  async generateCampaignCopy(params: GeneratedCopyParams): Promise<GeneratedSequenceStep[]> {
    const prompt = `You are a cold outbound email expert. Generate a 3-step outbound sequence in raw JSON format.
Product: ${params.productOrService}
Audience: ${params.targetAudience}
Value Prop: ${params.valueProposition}
Tone: ${params.tone || 'Concise and consultative'}
CTA: ${params.callToAction || 'Brief 10-minute sync'}

Return ONLY a JSON object with this shape:
{
  "steps": [
    { "stepNumber": 1, "delayDays": 0, "subject": "...", "body": "..." },
    { "stepNumber": 2, "delayDays": 3, "subject": "Re: ...", "body": "..." },
    { "stepNumber": 3, "delayDays": 4, "subject": "Re: ...", "body": "..." }
  ]
}`;

    const res = await this.client.messages.create({
      model: this.model,
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = res.content[0]?.type === 'text' ? res.content[0].text : '';
    const parsed = JSON.parse(this.extractJson(content));
    return parsed.steps || [];
  }

  async personalizeEmail(lead: LeadContext, instructions?: string): Promise<PersonalizationOutput> {
    const prompt = `You are a B2B sales personalization specialist.
CRITICAL CONSTRAINT: Do NOT hallucinate or fabricate facts about the lead or company. Use only the provided lead fields.
Lead Data: ${JSON.stringify(lead)}
Instructions: ${instructions || 'Write an opening line and pain point hypothesis.'}

Respond ONLY with valid JSON:
{
  "personalizedOpening": "grounded sentence",
  "painPointHypothesis": "relevant observation",
  "callToAction": "concise CTA"
}`;

    const res = await this.client.messages.create({
      model: this.model,
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = res.content[0]?.type === 'text' ? res.content[0].text : '';
    const parsed = JSON.parse(this.extractJson(content));
    return PersonalizationOutputSchema.parse(parsed);
  }

  async classifyReply(
    incomingEmailBody: string,
    threadContext: ThreadContext
  ): Promise<ReplyClassificationResult> {
    const prompt = `Classify this sales email reply into JSON.
Thread subject: ${threadContext.subject}
Recent history: ${JSON.stringify(threadContext.history.slice(-3))}
Inbound email: """${incomingEmailBody}"""

Intents: INTERESTED, QUESTION, NEEDS_MORE_INFORMATION, NOT_INTERESTED, UNSUBSCRIBE, OUT_OF_OFFICE, WRONG_PERSON, REFERRAL, MEETING_REQUEST, OTHER.

Respond ONLY with valid JSON:
{
  "intent": "INTERESTED",
  "confidence": 0.95,
  "summary": "1 sentence summary",
  "recommendedAction": "Action to take",
  "draftReply": "Suggested response draft",
  "stopCampaign": true
}`;

    const res = await this.client.messages.create({
      model: this.model,
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = res.content[0]?.type === 'text' ? res.content[0].text : '';
    const parsed = JSON.parse(this.extractJson(content));
    return ReplyClassificationSchema.parse(parsed);
  }

  async generateReply(threadContext: ThreadContext, customPrompt?: string): Promise<string> {
    const prompt = `Write a professional SDR reply.
Thread: ${threadContext.subject}
History: ${JSON.stringify(threadContext.history.slice(-3))}
Guidance: ${customPrompt || 'Be concise, helpful, and suggest a 10-minute discovery call.'}`;

    const res = await this.client.messages.create({
      model: this.model,
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    });

    return res.content[0]?.type === 'text' ? res.content[0].text.trim() : '';
  }

  async testConnection(): Promise<boolean> {
    const res = await this.client.messages.create({
      model: this.model,
      max_tokens: 5,
      messages: [{ role: 'user', content: 'Ping' }],
    });
    return !!res.content[0];
  }
}
