import {
  OutboundEmailParams,
  SendEmailResult,
  InboundEmail,
  FetchMessagesParams,
  ConnectionTestResult,
  MailboxInfo,
} from './types';

export interface EmailProvider {
  /**
   * Dispatches an outbound email via the provider's protocol or API.
   */
  sendEmail(params: OutboundEmailParams): Promise<SendEmailResult>;

  /**
   * Fetches incoming emails from inbox since a given date or limit.
   */
  fetchMessages(params?: FetchMessagesParams): Promise<InboundEmail[]>;

  /**
   * Fetches a full conversation thread by provider thread ID.
   */
  fetchThread(threadId: string): Promise<InboundEmail[]>;

  /**
   * Marks a specific message as read.
   */
  markAsRead(messageId: string): Promise<void>;

  /**
   * Verifies both outbound sending (SMTP/API) and inbound receiving (IMAP/API) credentials.
   */
  testConnection(): Promise<ConnectionTestResult>;

  /**
   * Returns metadata and quota info about the connected mailbox.
   */
  getMailboxInfo(): Promise<MailboxInfo>;
}
