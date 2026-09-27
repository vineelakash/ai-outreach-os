import { z } from 'zod';

export const ReplyIntentEnum = z.enum([
  'INTERESTED',
  'QUESTION',
  'NEEDS_MORE_INFORMATION',
  'NOT_INTERESTED',
  'UNSUBSCRIBE',
  'OUT_OF_OFFICE',
  'WRONG_PERSON',
  'REFERRAL',
  'MEETING_REQUEST',
  'OTHER',
]);

export type ReplyIntent = z.infer<typeof ReplyIntentEnum>;

export const ReplyClassificationSchema = z.object({
  intent: ReplyIntentEnum,
  confidence: z.number().min(0).max(1),
  summary: z.string().min(1),
  recommendedAction: z.string().min(1),
  draftReply: z.string().optional().default(''),
  stopCampaign: z.boolean().default(false),
});

export type ReplyClassificationResult = z.infer<typeof ReplyClassificationSchema>;

export const PersonalizationOutputSchema = z.object({
  personalizedOpening: z.string(),
  painPointHypothesis: z.string(),
  callToAction: z.string(),
});

export type PersonalizationOutput = z.infer<typeof PersonalizationOutputSchema>;

export interface LeadContext {
  firstName?: string | null;
  lastName?: string | null;
  company?: string | null;
  jobTitle?: string | null;
  industry?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  website?: string | null;
  customFields?: Record<string, unknown> | null;
}

export interface ThreadContext {
  subject: string;
  leadEmail: string;
  history: Array<{
    isOutbound: boolean;
    sender: string;
    body: string;
    date: Date | string;
  }>;
}

export interface GeneratedCopyParams {
  productOrService: string;
  targetAudience: string;
  valueProposition: string;
  tone?: string;
  callToAction?: string;
}

export interface GeneratedSequenceStep {
  stepNumber: number;
  delayDays: number;
  subject: string;
  body: string;
}
