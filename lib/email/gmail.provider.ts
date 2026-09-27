import { google } from 'googleapis';
import { EmailProvider } from './provider.interface';
import {
  OutboundEmailParams,
  SendEmailResult,
  InboundEmail,
  FetchMessagesParams,
  ConnectionTestResult,
  MailboxInfo,
  GmailOAuthCredentials,
} from './types';

export class GmailProvider implements EmailProvider {
  private mailboxEmail: string;
  private credentials: GmailOAuthCredentials;

  constructor(mailboxEmail: string, credentials: GmailOAuthCredentials) {
    this.mailboxEmail = mailboxEmail;
    this.credentials = credentials;
  }

  private getAuthClient() {
    const oAuth2Client = new google.auth.OAuth2(
      this.credentials.clientId,
      this.credentials.clientSecret
    );
    oAuth2Client.setCredentials({
      refresh_token: this.credentials.refreshToken,
      access_token: this.credentials.accessToken,
    });
    return oAuth2Client;
  }

  private buildMimeMessage(params: OutboundEmailParams): string {
    const lines = [
      `From: ${params.fromName ? `"${params.fromName}" <${params.from}>` : params.from}`,
      `To: ${params.toName ? `"${params.toName}" <${params.to}>` : params.to}`,
      `Subject: ${params.subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
    ];

    if (params.replyTo) {
      lines.push(`Reply-To: ${params.replyTo}`);
    }
    if (params.inReplyTo) {
      lines.push(`In-Reply-To: ${params.inReplyTo}`);
    }
    if (params.unsubscribeUrl) {
      lines.push(`List-Unsubscribe: <${params.unsubscribeUrl}>`);
      lines.push('List-Unsubscribe-Post: List-Unsubscribe=One-Click');
    }

    let html = params.bodyHtml || params.bodyText.replace(/\n/g, '<br/>');
    if (params.trackingPixelUrl) {
      html += `<img src="${params.trackingPixelUrl}" width="1" height="1" style="display:none;" alt="" />`;
    }

    lines.push('', html);

    const email = lines.join('\r\n');
    return Buffer.from(email)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  async sendEmail(params: OutboundEmailParams): Promise<SendEmailResult> {
    try {
      const auth = this.getAuthClient();
      const gmail = google.gmail({ version: 'v1', auth });

      const raw = this.buildMimeMessage(params);
      const res = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw,
          threadId: params.inReplyTo,
        },
      });

      return {
        success: true,
        messageId: res.data.id || '',
        threadId: res.data.threadId || undefined,
        rawResponse: res.data,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        messageId: '',
        error: errorMsg,
      };
    }
  }

  async fetchMessages(params?: FetchMessagesParams): Promise<InboundEmail[]> {
    try {
      const auth = this.getAuthClient();
      const gmail = google.gmail({ version: 'v1', auth });

      let q = 'in:inbox';
      if (params?.unreadOnly) q += ' is:unread';
      if (params?.since) {
        const epochSeconds = Math.floor(params.since.getTime() / 1000);
        q += ` after:${epochSeconds}`;
      }

      const res = await gmail.users.messages.list({
        userId: 'me',
        q,
        maxResults: params?.limit || 20,
      });

      const messages = res.data.messages || [];
      const inboundEmails: InboundEmail[] = [];

      for (const msg of messages) {
        if (!msg.id) continue;
        const detail = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'full',
        });

        const headers = detail.data.payload?.headers || [];
        const getHeader = (name: string) =>
          headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || '';

        const from = getHeader('from');
        const subject = getHeader('subject');
        const inReplyTo = getHeader('in-reply-to');

        inboundEmails.push({
          id: msg.id,
          threadId: detail.data.threadId || undefined,
          fromEmail: from,
          toEmail: this.mailboxEmail,
          subject: subject || '(No Subject)',
          bodyText: detail.data.snippet || '',
          date: new Date(Number(detail.data.internalDate) || Date.now()),
          inReplyTo: inReplyTo || undefined,
        });
      }

      return inboundEmails;
    } catch (err) {
      console.error('[GMAIL_FETCH_ERROR]', err);
      return [];
    }
  }

  async fetchThread(threadId: string): Promise<InboundEmail[]> {
    try {
      const auth = this.getAuthClient();
      const gmail = google.gmail({ version: 'v1', auth });

      const res = await gmail.users.threads.get({
        userId: 'me',
        id: threadId,
        format: 'full',
      });

      const messages = res.data.messages || [];
      return messages.map((m) => {
        const headers = m.payload?.headers || [];
        const getHeader = (name: string) =>
          headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || '';

        return {
          id: m.id || '',
          threadId: m.threadId || undefined,
          fromEmail: getHeader('from'),
          toEmail: getHeader('to') || this.mailboxEmail,
          subject: getHeader('subject') || '',
          bodyText: m.snippet || '',
          date: new Date(Number(m.internalDate) || Date.now()),
        };
      });
    } catch (err) {
      console.error('[GMAIL_FETCH_THREAD_ERROR]', err);
      return [];
    }
  }

  async markAsRead(messageId: string): Promise<void> {
    try {
      const auth = this.getAuthClient();
      const gmail = google.gmail({ version: 'v1', auth });
      await gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          removeLabelIds: ['UNREAD'],
        },
      });
    } catch (err) {
      console.error('[GMAIL_MARK_READ_ERROR]', err);
    }
  }

  async testConnection(): Promise<ConnectionTestResult> {
    try {
      const auth = this.getAuthClient();
      const gmail = google.gmail({ version: 'v1', auth });
      const profile = await gmail.users.getProfile({ userId: 'me' });

      return {
        success: true,
        canSend: true,
        canReceive: true,
        message: `Connected to Gmail as ${profile.data.emailAddress}`,
      };
    } catch (err: unknown) {
      return {
        success: false,
        canSend: false,
        canReceive: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  async getMailboxInfo(): Promise<MailboxInfo> {
    const auth = this.getAuthClient();
    const gmail = google.gmail({ version: 'v1', auth });
    const profile = await gmail.users.getProfile({ userId: 'me' });
    return {
      email: profile.data.emailAddress || this.mailboxEmail,
      provider: 'GMAIL',
      quota: {
        used: profile.data.messagesTotal || 0,
        total: 100000,
      },
    };
  }
}
