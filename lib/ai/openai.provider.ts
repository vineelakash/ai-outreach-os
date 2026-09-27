import OpenAI from 'openai';
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

export class OpenAIProvider implements AIProvider {
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model: string = 'gpt-4o-mini') {
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  async generateCampaignCopy(params: GeneratedCopyParams): Promise<GeneratedSequenceStep[]> {
    const prompt = `You are a world-class cold outreach copywriter. Create a high-converting 3-step outbound email sequence.
Product/Service: ${params.productOrService}
Target Audience: ${params.targetAudience}
Value Proposition: ${params.valueProposition}
Tone: ${params.tone || 'Concise, professional, and friendly'}
Call to Action: ${params.callToAction || 'Brief 10-minute discovery call'}

Guidelines:
- Step 1: Initial outreach (0 days delay)
- Step 2: Follow-up adding value or case insight (3 days delay)
- Step 3: Breakup email / low-pressure closure (4 days delay)
- Use standard merge tags: {{firstName}}, {{company}}, {{senderName}}.
- Keep emails under 100 words.

Return JSON in the following format:
{
  "steps": [
    { "stepNumber": 1, "delayDays": 0, "subject": "...", "body": "..." },
    { "stepNumber": 2, "delayDays": 3, "subject": "Re: ...", "body": "..." },
    { "stepNumber": 3, "delayDays": 4, "subject": "Re: ...", "body": "..." }
  ]
}`;

    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}');
    return parsed.steps || [];
  }

  async personalizeEmail(lead: LeadContext, instructions?: string): Promise<PersonalizationOutput> {
    const prompt = `You are an expert sales personalization assistant.
CRITICAL RULE: DO NOT invent facts, achievements, awards, or fake data. Only ground your response in the provided lead context.
Lead Context:
${JSON.stringify(lead, null, 2)}
Custom Instructions: ${instructions || 'Write a personalized opening line and pain point observation.'}

Return JSON strictly matching this schema:
{
  "personalizedOpening": "one relevant, grounded sentence",
  "painPointHypothesis": "one plausible industry observation without hallucinating company specifics",
  "callToAction": "one low-friction question"
}`;

    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}');
    return PersonalizationOutputSchema.parse(parsed);
  }

  async classifyReply(
    incomingEmailBody: string,
    threadContext: ThreadContext
  ): Promise<ReplyClassificationResult> {
    const prompt = `You are an autonomous AI SDR inbox assistant.
Classify the intent of the incoming lead email and produce a draft response.

Available intents:
INTERESTED, QUESTION, NEEDS_MORE_INFORMATION, NOT_INTERESTED, UNSUBSCRIBE, OUT_OF_OFFICE, WRONG_PERSON, REFERRAL, MEETING_REQUEST, OTHER.

Campaign / Thread Context:
Subject: ${threadContext.subject}
History: ${JSON.stringify(threadContext.history.slice(-3))}

Incoming Email:
"""${incomingEmailBody}"""

Rules:
- If lead requests removal, unsubscribing, or says "stop", set intent="UNSUBSCRIBE" and stopCampaign=true.
- If lead asks for a meeting or calendar, set intent="MEETING_REQUEST" and stopCampaign=true.
- If lead asks questions, set intent="QUESTION" and stopCampaign=true.
- If out of office auto-reply, set intent="OUT_OF_OFFICE" and stopCampaign=false.

Return JSON in this format:
{
  "intent": "INTERESTED",
  "confidence": 0.95,
  "summary": "Short 1-sentence summary",
  "recommendedAction": "Action name",
  "draftReply": "Draft response ready to send",
  "stopCampaign": true
}`;

    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    });

    const raw = JSON.parse(completion.choices[0]?.message?.content || '{}');
    return ReplyClassificationSchema.parse(raw);
  }

  async generateReply(threadContext: ThreadContext, customPrompt?: string): Promise<string> {
    const prompt = `You are a professional SDR. Write a friendly, concise reply to the customer.
Thread Subject: ${threadContext.subject}
Recent Conversation: ${JSON.stringify(threadContext.history.slice(-4))}
User Guidance: ${customPrompt || 'Be direct, helpful, and suggest a 10-minute discovery call.'}`;

    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
    });

    return completion.choices[0]?.message?.content?.trim() || '';
  }

  async testConnection(): Promise<boolean> {
    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages: [{ role: 'user', content: 'Ping' }],
      max_tokens: 5,
    });
    return !!completion.choices[0];
  }
}
