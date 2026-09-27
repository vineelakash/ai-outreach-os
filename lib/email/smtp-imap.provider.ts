import nodemailer from 'nodemailer';
import { ImapFlow } from 'imapflow';
import { EmailProvider } from './provider.interface';
import {
  OutboundEmailParams,
  SendEmailResult,
  InboundEmail,
  FetchMessagesParams,
  ConnectionTestResult,
  MailboxInfo,
  SmtpImapCredentials,
} from './types';

export class SmtpImapProvider implements EmailProvider {
  private credentials: SmtpImapCredentials;
  private mailboxEmail: string;

  constructor(mailboxEmail: string, credentials: SmtpImapCredentials) {
    this.mailboxEmail = mailboxEmail;
    this.credentials = credentials;
  }

  private createTransporter() {
    return nodemailer.createTransport({
      host: this.credentials.smtpHost,
      port: this.credentials.smtpPort,
      secure: this.credentials.smtpSecure ?? (this.credentials.smtpPort === 465),
      auth: {
        user: this.credentials.smtpUser,
        pass: this.credentials.smtpPass,
      },
      pool: true,
      maxConnections: 3,
      maxMessages: 50,
    });
  }

  private createImapClient() {
    return new ImapFlow({
      host: this.credentials.imapHost,
      port: this.credentials.imapPort,
      secure: this.credentials.imapTls ?? (this.credentials.imapPort === 993),
      auth: {
        user: this.credentials.imapUser,
        pass: this.credentials.imapPass,
      },
      logger: false,
    });
  }

  async sendEmail(params: OutboundEmailParams): Promise<SendEmailResult> {
    try {
      const transporter = this.createTransporter();

      const headers: Record<string, string> = { ...(params.headers || {}) };
      if (params.unsubscribeUrl) {
        headers['List-Unsubscribe'] = `<${params.unsubscribeUrl}>`;
        headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
      }

      let html = params.bodyHtml || params.bodyText.replace(/\n/g, '<br/>');
      if (params.trackingPixelUrl) {
        html += `<img src="${params.trackingPixelUrl}" width="1" height="1" style="display:none;" alt="" />`;
      }

      const info = await transporter.sendMail({
        from: `"${params.fromName || params.from}" <${params.from}>`,
        to: params.toName ? `"${params.toName}" <${params.to}>` : params.to,
        replyTo: params.replyTo || params.from,
        subject: params.subject,
        text: params.bodyText,
        html: html,
        inReplyTo: params.inReplyTo,
        references: params.references,
        headers,
      });

      return {
        success: true,
        messageId: info.messageId,
        rawResponse: info,
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
    const client = this.createImapClient();
    const emails: InboundEmail[] = [];

    try {
      await client.connect();
      const lock = await client.getMailboxLock('INBOX');

      try {
        const query: Record<string, unknown> = {};
        if (params?.since) {
          query.since = params.since;
        }
        if (params?.unreadOnly) {
          query.seen = false;
        }

        const limit = params?.limit || 25;
        let count = 0;

        // Fetch latest messages
        for await (const message of client.fetch(query, {
          envelope: true,
          source: true,
          headers: ['in-reply-to', 'references', 'message-id'],
        })) {
          if (count >= limit) break;

          const envelope = message.envelope;
          const fromAddr = envelope?.from?.[0]?.address || '';
          const fromName = envelope?.from?.[0]?.name || '';
          const toAddr = envelope?.to?.[0]?.address || this.mailboxEmail;
          const subject = envelope?.subject || '(No Subject)';
          const inReplyTo =
            message.headers && typeof (message.headers as any).get === 'function'
              ? (message.headers as any).get('in-reply-to')
              : undefined;

          emails.push({
            id: String(message.uid),
            fromEmail: fromAddr,
            fromName: fromName,
            toEmail: toAddr,
            subject,
            bodyText: message.source ? message.source.toString('utf8').slice(0, 4000) : '',
            date: envelope?.date || new Date(),
            inReplyTo: typeof inReplyTo === 'string' ? inReplyTo : undefined,
          });

          count++;
        }
      } finally {
        lock.release();
      }

      await client.logout();
    } catch (error) {
      console.error('[IMAP_FETCH_ERROR]', error);
    }

    return emails;
  }

  async fetchThread(threadId: string): Promise<InboundEmail[]> {
    // Standard IMAP does not have native Gmail-like thread IDs; fetch messages referencing threadId
    const all = await this.fetchMessages({ limit: 50 });
    return all.filter((m) => m.inReplyTo === threadId || m.id === threadId);
  }

  async markAsRead(messageId: string): Promise<void> {
    const client = this.createImapClient();
    try {
      await client.connect();
      const lock = await client.getMailboxLock('INBOX');
      try {
        await client.messageFlagsAdd({ uid: messageId }, ['\\Seen']);
      } finally {
        lock.release();
      }
      await client.logout();
    } catch (err) {
      console.error('[IMAP_MARK_READ_ERROR]', err);
    }
  }

  async testConnection(): Promise<ConnectionTestResult> {
    let canSend = false;
    let canReceive = false;
    const errors: string[] = [];

    // Test SMTP
    try {
      const transporter = this.createTransporter();
      await transporter.verify();
      canSend = true;
    } catch (err: unknown) {
      errors.push(`SMTP error: ${err instanceof Error ? err.message : String(err)}`);
    }

    // Test IMAP
    try {
      const client = this.createImapClient();
      await client.connect();
      await client.logout();
      canReceive = true;
    } catch (err: unknown) {
      errors.push(`IMAP error: ${err instanceof Error ? err.message : String(err)}`);
    }

    return {
      success: canSend && canReceive,
      canSend,
      canReceive,
      error: errors.length > 0 ? errors.join('; ') : undefined,
      message: canSend && canReceive ? 'SMTP and IMAP connections verified successfully' : undefined,
    };
  }

  async getMailboxInfo(): Promise<MailboxInfo> {
    return {
      email: this.mailboxEmail,
      provider: 'SMTP_IMAP',
    };
  }
}
