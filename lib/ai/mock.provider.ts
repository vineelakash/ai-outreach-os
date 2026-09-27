import { AIProvider } from './ai.interface';
import {
  ReplyClassificationResult,
  PersonalizationOutput,
  LeadContext,
  ThreadContext,
  GeneratedCopyParams,
  GeneratedSequenceStep,
} from './types';

export class MockAIProvider implements AIProvider {
  async generateCampaignCopy(params: GeneratedCopyParams): Promise<GeneratedSequenceStep[]> {
    return [
      {
        stepNumber: 1,
        delayDays: 0,
        subject: `Quick question regarding ${params.targetAudience} growth`,
        body: `Hi {{firstName}},\n\nI noticed your work at {{company}}. We help teams with ${params.valueProposition}.\n\nWould you be open to a quick 10-minute chat this week?\n\nBest,\n{{senderName}}`,
      },
      {
        stepNumber: 2,
        delayDays: 3,
        subject: `Re: Quick question regarding ${params.targetAudience} growth`,
        body: `Hi {{firstName}},\n\nFollowing up on my previous note. Thought you might find value in how we streamlined ${params.productOrService} operations.\n\nLet me know if you have a few minutes.\n\nBest,\n{{senderName}}`,
      },
      {
        stepNumber: 3,
        delayDays: 4,
        subject: `Final follow up - {{company}}`,
        body: `Hi {{firstName}},\n\nI assume you're busy right now. If ${params.productOrService} isn't a priority at {{company}}, no worries at all.\n\nFeel free to reach back out if things change.\n\nBest,\n{{senderName}}`,
      },
    ];
  }

  async personalizeEmail(lead: LeadContext, instructions?: string): Promise<PersonalizationOutput> {
    const company = lead.company || 'your team';
    const role = lead.jobTitle || 'leader';
    const industry = lead.industry ? ` in the ${lead.industry} space` : '';

    return {
      personalizedOpening: `I noticed your work as ${role} at ${company}${industry}.`,
      painPointHypothesis: `Scaling outbound pipelines without compromising deliverability is often a bottleneck for ${company}.`,
      callToAction: `Are you free for a brief sync this Thursday?`,
    };
  }

  async classifyReply(
    incomingEmailBody: string,
    threadContext: ThreadContext
  ): Promise<ReplyClassificationResult> {
    const text = incomingEmailBody.toLowerCase();

    if (text.includes('unsubscribe') || text.includes('remove me') || text.includes('stop')) {
      return {
        intent: 'UNSUBSCRIBE',
        confidence: 0.98,
        summary: 'Lead requested to be removed from the mailing list.',
        recommendedAction: 'STOP_AND_UNSUBSCRIBE',
        stopCampaign: true,
        draftReply: 'You have been removed from our list. We apologize for the disturbance.',
      };
    }

    if (text.includes('interest') || text.includes('tell me more') || text.includes('send info') || text.includes('sounds good')) {
      return {
        intent: 'INTERESTED',
        confidence: 0.94,
        summary: 'Lead expressed direct interest and wants more details.',
        recommendedAction: 'SEND_MORE_INFO',
        stopCampaign: true,
        draftReply: 'Thanks for getting back to me! I would be happy to share more details. Does tomorrow at 2 PM work for a brief demo?',
      };
    }

    if (text.includes('calendar') || text.includes('book') || text.includes('call') || text.includes('meeting') || text.includes('schedule')) {
      return {
        intent: 'MEETING_REQUEST',
        confidence: 0.96,
        summary: 'Lead wants to schedule a meeting or call.',
        recommendedAction: 'SEND_BOOKING_LINK',
        stopCampaign: true,
        draftReply: 'Great, look forward to speaking! You can grab any slot that works for you here: https://cal.com/demo',
      };
    }

    if (text.includes('not interested') || text.includes('no thank') || text.includes('not right now')) {
      return {
        intent: 'NOT_INTERESTED',
        confidence: 0.92,
        summary: 'Lead politely declined the outreach.',
        recommendedAction: 'MARK_NOT_INTERESTED',
        stopCampaign: true,
        draftReply: 'Understood! Thanks for letting me know. Have a wonderful week.',
      };
    }

    if (text.includes('out of office') || text.includes('auto-reply') || text.includes('on leave')) {
      return {
        intent: 'OUT_OF_OFFICE',
        confidence: 0.95,
        summary: 'Automated out of office auto-reply.',
        recommendedAction: 'WAIT_FOR_RETURN',
        stopCampaign: false,
        draftReply: '',
      };
    }

    return {
      intent: 'QUESTION',
      confidence: 0.85,
      summary: 'Lead asked a question regarding the outreach.',
      recommendedAction: 'ANSWER_QUESTION',
      stopCampaign: true,
      draftReply: 'Thanks for reaching out! Regarding your question, our platform handles this natively with automated guardrails.',
    };
  }

  async generateReply(threadContext: ThreadContext, customPrompt?: string): Promise<string> {
    return `Hi there,\n\nThanks for your note. Regarding your feedback on "${threadContext.subject}", we'd love to show you how this works in practice.\n\nDoes tomorrow afternoon work for a quick conversation?\n\nBest regards.`;
  }

  async testConnection(): Promise<boolean> {
    return true;
  }
}
