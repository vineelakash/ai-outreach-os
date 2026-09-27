import {
  EmailProvider,
} from './provider.interface';
import {
  OutboundEmailParams,
  SendEmailResult,
  InboundEmail,
  FetchMessagesParams,
  ConnectionTestResult,
  MailboxInfo,
} from './types';

export class MockEmailProvider implements EmailProvider {
  private mailboxEmail: string;
  private sentMessages: OutboundEmailParams[] = [];
  private inbox: InboundEmail[] = [];

  constructor(mailboxEmail: string = 'mock-sender@outreach-os.local') {
    this.mailboxEmail = mailboxEmail;
  }

  async sendEmail(params: OutboundEmailParams): Promise<SendEmailResult> {
    const messageId = `<mock-${Date.now()}-${Math.random().toString(36).substring(7)}@${this.mailboxEmail.split('@')[1] || 'outreach-os.local'}>`;
    this.sentMessages.push(params);

    return {
      success: true,
      messageId,
      threadId: params.inReplyTo || messageId,
      rawResponse: { status: 'mock_sent', timestamp: new Date().toISOString() },
    };
  }

  async fetchMessages(params?: FetchMessagesParams): Promise<InboundEmail[]> {
    let result = [...this.inbox];
    if (params?.since) {
      result = result.filter((m) => m.date >= params.since!);
    }
    if (params?.limit) {
      result = result.slice(0, params.limit);
    }
    return result;
  }

  async fetchThread(threadId: string): Promise<InboundEmail[]> {
    return this.inbox.filter((m) => m.threadId === threadId || m.id === threadId);
  }

  async markAsRead(messageId: string): Promise<void> {
    // In-memory mock read marker
    const msg = this.inbox.find((m) => m.id === messageId);
    if (msg) {
      // Marked as read
    }
  }

  async testConnection(): Promise<ConnectionTestResult> {
    return {
      success: true,
      canSend: true,
      canReceive: true,
      message: 'Mock provider connection verified successfully',
    };
  }

  async getMailboxInfo(): Promise<MailboxInfo> {
    return {
      email: this.mailboxEmail,
      provider: 'MOCK',
      quota: {
        used: this.sentMessages.length,
        total: 500,
      },
    };
  }

  // Helper for test assertions and simulation
  addInboundEmail(email: InboundEmail) {
    this.inbox.push(email);
  }

  getSentMessages() {
    return this.sentMessages;
  }

  clear() {
    this.sentMessages = [];
    this.inbox = [];
  }
}
