import { describe, it, expect } from 'vitest';
import { MockAIProvider } from '@/lib/ai/mock.provider';
import { ReplyClassificationSchema, PersonalizationOutputSchema } from '@/lib/ai/types';

describe('Multi-Model AI Engine', () => {
  const ai = new MockAIProvider();

  it('should generate structured 3-step campaign copy', async () => {
    const sequence = await ai.generateCampaignCopy({
      productOrService: 'Outbound Deliverability OS',
      targetAudience: 'Heads of Sales',
      valueProposition: 'Improve reply rates by 2.5x',
    });

    expect(sequence.length).toBe(3);
    expect(sequence[0].stepNumber).toBe(1);
    expect(sequence[0].subject).toContain('Heads of Sales');
    expect(sequence[0].body).toContain('{{firstName}}');
  });

  it('should classify an interested reply and validate against Zod schema', async () => {
    const classification = await ai.classifyReply('This sounds interesting, please send more info!', {
      subject: 'Outbound sync',
      leadEmail: 'prospect@acme.com',
      history: [],
    });

    const validated = ReplyClassificationSchema.safeParse(classification);
    expect(validated.success).toBe(true);
    expect(classification.intent).toBe('INTERESTED');
    expect(classification.stopCampaign).toBe(true);
    expect(classification.draftReply).toBeDefined();
  });

  it('should classify an unsubscribe request with high confidence and stop campaign', async () => {
    const classification = await ai.classifyReply('Please remove me from your mailing list and unsubscribe.', {
      subject: 'Outbound sync',
      leadEmail: 'prospect@acme.com',
      history: [],
    });

    expect(classification.intent).toBe('UNSUBSCRIBE');
    expect(classification.stopCampaign).toBe(true);
    expect(classification.confidence).toBeGreaterThan(0.9);
  });

  it('should generate grounded personalization strictly adhering to schema', async () => {
    const result = await ai.personalizeEmail({
      firstName: 'Sarah',
      company: 'Apex Logistics',
      jobTitle: 'VP of Supply Chain',
      industry: 'Logistics',
    });

    const parsed = PersonalizationOutputSchema.safeParse(result);
    expect(parsed.success).toBe(true);
    expect(result.personalizedOpening).toContain('Apex Logistics');
    expect(result.personalizedOpening).toContain('VP of Supply Chain');
  });
});
