export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface OutboundEmailParams {
  to: string;
  toName?: string;
  from: string;
  fromName?: string;
  replyTo?: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  inReplyTo?: string;
  references?: string[];
  headers?: Record<string, string>;
  trackingPixelUrl?: string;
  unsubscribeUrl?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId: string;
  threadId?: string;
  rawResponse?: unknown;
  error?: string;
}

export interface InboundEmail {
  id: string;
  threadId?: string;
  fromEmail: string;
  fromName?: string;
  toEmail: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  date: Date;
  inReplyTo?: string;
  references?: string[];
  headers?: Record<string, string>;
}

export interface FetchMessagesParams {
  since?: Date;
  limit?: number;
  unreadOnly?: boolean;
}

export interface ConnectionTestResult {
  success: boolean;
  canSend: boolean;
  canReceive: boolean;
  message?: string;
  error?: string;
}

export interface MailboxInfo {
  email: string;
  provider: string;
  quota?: {
    used: number;
    total: number;
  };
}

export interface SmtpImapCredentials {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  smtpSecure?: boolean; // true for 465, false for 587/STARTTLS
  imapHost: string;
  imapPort: number;
  imapUser: string;
  imapPass: string;
  imapTls?: boolean;
}

export interface GmailOAuthCredentials {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  accessToken?: string;
}

export interface MicrosoftGraphCredentials {
  tenantId?: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  accessToken?: string;
}
