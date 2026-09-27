import { GoogleGenerativeAI } from '@google/generative-ai';
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

export class GeminiProvider implements AIProvider {
  private genAI: GoogleGenerativeAI;
  private modelName: string;

  constructor(apiKey: string, modelName: string = 'gemini-1.5-flash') {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.modelName = modelName;
  }

  private cleanJsonResponse(text: string): string {
    return text.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
  }

  async generateCampaignCopy(params: GeneratedCopyParams): Promise<GeneratedSequenceStep[]> {
    const model = this.genAI.getGenerativeModel({
      model: this.modelName,
      generationConfig: { responseMimeType: 'application/json' },
    });

    const prompt = `You are a cold outbound email expert. Create a 3-step outbound email sequence in JSON.
Product: ${params.productOrService}
Audience: ${params.targetAudience}
Value Prop: ${params.valueProposition}
Tone: ${params.tone || 'Concise and consultative'}
CTA: ${params.callToAction || 'Quick intro call'}

Format:
{
  "steps": [
    { "stepNumber": 1, "delayDays": 0, "subject": "...", "body": "..." },
    { "stepNumber": 2, "delayDays": 3, "subject": "Re: ...", "body": "..." },
    { "stepNumber": 3, "delayDays": 4, "subject": "Re: ...", "body": "..." }
  ]
}`;

    const res = await model.generateContent(prompt);
    const parsed = JSON.parse(this.cleanJsonResponse(res.response.text()));
    return parsed.steps || [];
  }

  async personalizeEmail(lead: LeadContext, instructions?: string): Promise<PersonalizationOutput> {
    const model = this.genAI.getGenerativeModel({
      model: this.modelName,
      generationConfig: { responseMimeType: 'application/json' },
    });

    const prompt = `You are an expert SDR personalizing outbound copy.
CRITICAL: Do NOT invent or hallucinate facts about the lead or company. Use only the data below.
Lead: ${JSON.stringify(lead)}
Instructions: ${instructions || 'Write an opening line and pain point hypothesis.'}

Output JSON format:
{
  "personalizedOpening": "grounded sentence",
  "painPointHypothesis": "relevant observation",
  "callToAction": "concise CTA"
}`;

    const res = await model.generateContent(prompt);
    const parsed = JSON.parse(this.cleanJsonResponse(res.response.text()));
    return PersonalizationOutputSchema.parse(parsed);
  }

  async classifyReply(
    incomingEmailBody: string,
    threadContext: ThreadContext
  ): Promise<ReplyClassificationResult> {
    const model = this.genAI.getGenerativeModel({
      model: this.modelName,
      generationConfig: { responseMimeType: 'application/json' },
    });

    const prompt = `Classify this inbound sales email response and return JSON.
Thread subject: ${threadContext.subject}
Recent history: ${JSON.stringify(threadContext.history.slice(-3))}
Inbound message: """${incomingEmailBody}"""

Intent options: INTERESTED, QUESTION, NEEDS_MORE_INFORMATION, NOT_INTERESTED, UNSUBSCRIBE, OUT_OF_OFFICE, WRONG_PERSON, REFERRAL, MEETING_REQUEST, OTHER.

Return format:
{
  "intent": "INTERESTED",
  "confidence": 0.9,
  "summary": "1 sentence summary",
  "recommendedAction": "Recommended SDR action",
  "draftReply": "Draft response ready to send",
  "stopCampaign": true
}`;

    const res = await model.generateContent(prompt);
    const parsed = JSON.parse(this.cleanJsonResponse(res.response.text()));
    return ReplyClassificationSchema.parse(parsed);
  }

  async generateReply(threadContext: ThreadContext, customPrompt?: string): Promise<string> {
    const model = this.genAI.getGenerativeModel({ model: this.modelName });
    const prompt = `You are an SDR replying to a prospect.
Subject: ${threadContext.subject}
Thread: ${JSON.stringify(threadContext.history.slice(-3))}
Instruction: ${customPrompt || 'Keep it brief, courteous, and propose a calendar invite.'}`;

    const res = await model.generateContent(prompt);
    return res.response.text().trim();
  }

  async testConnection(): Promise<boolean> {
    const model = this.genAI.getGenerativeModel({ model: this.modelName });
    const res = await model.generateContent('ping');
    return !!res.response.text();
  }
}
