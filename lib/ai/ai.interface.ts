import {
  ReplyClassificationResult,
  PersonalizationOutput,
  LeadContext,
  ThreadContext,
  GeneratedCopyParams,
  GeneratedSequenceStep,
} from './types';

export interface AIProvider {
  /**
   * Generates a multi-step outbound email sequence based on campaign parameters.
   */
  generateCampaignCopy(params: GeneratedCopyParams): Promise<GeneratedSequenceStep[]>;

  /**
   * Personalizes outreach lines strictly grounded in verified lead fields.
   */
  personalizeEmail(lead: LeadContext, instructions?: string): Promise<PersonalizationOutput>;

  /**
   * Analyzes an inbound email against thread history to classify intent and suggest next action.
   */
  classifyReply(incomingEmailBody: string, threadContext: ThreadContext): Promise<ReplyClassificationResult>;

  /**
   * Generates a context-aware reply to an inbound lead email.
   */
  generateReply(threadContext: ThreadContext, customPrompt?: string): Promise<string>;

  /**
   * Tests whether the AI provider credentials and model are functioning.
   */
  testConnection(): Promise<boolean>;
}
