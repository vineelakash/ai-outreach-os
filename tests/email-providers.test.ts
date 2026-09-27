import { describe, it, expect } from 'vitest';
import { MockEmailProvider } from '@/lib/email/mock.provider';

describe('Email Provider Abstraction Layer', () => {
  it('should send email and record message ID in mock provider', async () => {
    const provider = new MockEmailProvider('test-sender@acme.com');

    const result = await provider.sendEmail({
      to: 'lead@target.com',
      from: 'test-sender@acme.com',
      subject: 'Hello there',
      bodyText: 'We help teams grow.',
      unsubscribeUrl: 'https://app.com/api/unsubscribe/123',
    });

    expect(result.success).toBe(true);
    expect(result.messageId).toContain('mock-');

    const sent = provider.getSentMessages();
    expect(sent.length).toBe(1);
    expect(sent[0].to).toBe('lead@target.com');
  });

  it('should test connection successfully', async () => {
    const provider = new MockEmailProvider('test@acme.com');
    const testResult = await provider.testConnection();

    expect(testResult.success).toBe(true);
    expect(testResult.canSend).toBe(true);
    expect(testResult.canReceive).toBe(true);
  });

  it('should store and fetch incoming messages and threads', async () => {
    const provider = new MockEmailProvider('test@acme.com');

    provider.addInboundEmail({
      id: 'msg-inbound-1',
      threadId: 'thread-1',
      fromEmail: 'prospect@client.com',
      toEmail: 'test@acme.com',
      subject: 'Re: Hello there',
      bodyText: 'Sounds great, send more info.',
      date: new Date(),
    });

    const messages = await provider.fetchMessages();
    expect(messages.length).toBe(1);
    expect(messages[0].fromEmail).toBe('prospect@client.com');

    const thread = await provider.fetchThread('thread-1');
    expect(thread.length).toBe(1);
  });
});
