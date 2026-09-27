import { Client } from '@microsoft/microsoft-graph-client';
import { EmailProvider } from './provider.interface';
import {
  OutboundEmailParams,
  SendEmailResult,
  InboundEmail,
  FetchMessagesParams,
  ConnectionTestResult,
  MailboxInfo,
  MicrosoftGraphCredentials,
} from './types';

export class MicrosoftGraphProvider implements EmailProvider {
  private mailboxEmail: string;
  private credentials: MicrosoftGraphCredentials;

  constructor(mailboxEmail: string, credentials: MicrosoftGraphCredentials) {
    this.mailboxEmail = mailboxEmail;
    this.credentials = credentials;
  }

  private async getAccessToken(): Promise<string> {
    if (this.credentials.accessToken) {
      return this.credentials.accessToken;
    }

    // Refresh token exchange via Microsoft OAuth token endpoint
    const tenant = this.credentials.tenantId || 'common';
    const tokenUrl = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`;

    const body = new URLSearchParams({
      client_id: this.credentials.clientId,
      client_secret: this.credentials.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: this.credentials.refreshToken,
      scope: 'https://graph.microsoft.com/Mail.ReadWrite https://graph.microsoft.com/Mail.Send offline_access',
    });

    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Failed to refresh Microsoft Graph token: ${errText}`);
    }

    const data = (await res.json()) as { access_token: string };
    return data.access_token;
  }

  private async getGraphClient(): Promise<Client> {
    const token = await this.getAccessToken();
    return Client.init({
      authProvider: (done) => {
        done(null, token);
      },
    });
  }

  async sendEmail(params: OutboundEmailParams): Promise<SendEmailResult> {
    try {
      const client = await this.getGraphClient();

      let html = params.bodyHtml || params.bodyText.replace(/\n/g, '<br/>');
      if (params.trackingPixelUrl) {
        html += `<img src="${params.trackingPixelUrl}" width="1" height="1" style="display:none;" alt="" />`;
      }

      const internetMessageHeaders: Array<{ name: string; value: string }> = [];
      if (params.unsubscribeUrl) {
        internetMessageHeaders.push({
          name: 'List-Unsubscribe',
          value: `<${params.unsubscribeUrl}>`,
        });
        internetMessageHeaders.push({
          name: 'List-Unsubscribe-Post',
          value: 'List-Unsubscribe=One-Click',
        });
      }

      const messagePayload: Record<string, unknown> = {
        subject: params.subject,
        body: {
          contentType: 'HTML',
          content: html,
        },
        toRecipients: [
          {
            emailAddress: {
              address: params.to,
              name: params.toName || params.to,
            },
          },
        ],
        internetMessageHeaders,
      };

      if (params.replyTo) {
        messagePayload.replyTo = [
          {
            emailAddress: {
              address: params.replyTo,
            },
          },
        ];
      }

      // Send via Microsoft Graph /me/sendMail
      await client.api('/me/sendMail').post({
        message: messagePayload,
        saveToSentItems: true,
      });

      const messageId = `<msg-ms-${Date.now()}-${Math.random().toString(36).substring(7)}@graph.microsoft.com>`;

      return {
        success: true,
        messageId,
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
      const client = await this.getGraphClient();
      let query = client.api('/me/mailFolders/inbox/messages').top(params?.limit || 25);

      if (params?.unreadOnly) {
        query = query.filter('isRead eq false');
      }

      const res = await query.get();
      const messages = (res.value || []) as Array<{
        id: string;
        conversationId?: string;
        from?: { emailAddress?: { address?: string; name?: string } };
        toRecipients?: Array<{ emailAddress?: { address?: string } }>;
        subject?: string;
        bodyPreview?: string;
        receivedDateTime?: string;
      }>;

      return messages.map((m) => ({
        id: m.id,
        threadId: m.conversationId,
        fromEmail: m.from?.emailAddress?.address || '',
        fromName: m.from?.emailAddress?.name || '',
        toEmail: m.toRecipients?.[0]?.emailAddress?.address || this.mailboxEmail,
        subject: m.subject || '(No Subject)',
        bodyText: m.bodyPreview || '',
        date: m.receivedDateTime ? new Date(m.receivedDateTime) : new Date(),
      }));
    } catch (err) {
      console.error('[GRAPH_FETCH_ERROR]', err);
      return [];
    }
  }

  async fetchThread(threadId: string): Promise<InboundEmail[]> {
    try {
      const client = await this.getGraphClient();
      const res = await client
        .api('/me/messages')
        .filter(`conversationId eq '${threadId}'`)
        .get();

      const messages = (res.value || []) as Array<{
        id: string;
        conversationId?: string;
        from?: { emailAddress?: { address?: string; name?: string } };
        toRecipients?: Array<{ emailAddress?: { address?: string } }>;
        subject?: string;
        bodyPreview?: string;
        receivedDateTime?: string;
      }>;

      return messages.map((m) => ({
        id: m.id,
        threadId: m.conversationId,
        fromEmail: m.from?.emailAddress?.address || '',
        fromName: m.from?.emailAddress?.name || '',
        toEmail: m.toRecipients?.[0]?.emailAddress?.address || this.mailboxEmail,
        subject: m.subject || '(No Subject)',
        bodyText: m.bodyPreview || '',
        date: m.receivedDateTime ? new Date(m.receivedDateTime) : new Date(),
      }));
    } catch (err) {
      console.error('[GRAPH_FETCH_THREAD_ERROR]', err);
      return [];
    }
  }

  async markAsRead(messageId: string): Promise<void> {
    try {
      const client = await this.getGraphClient();
      await client.api(`/me/messages/${messageId}`).update({
        isRead: true,
      });
    } catch (err) {
      console.error('[GRAPH_MARK_READ_ERROR]', err);
    }
  }

  async testConnection(): Promise<ConnectionTestResult> {
    try {
      const client = await this.getGraphClient();
      const user = (await client.api('/me').get()) as { userPrincipalName?: string; mail?: string };

      return {
        success: true,
        canSend: true,
        canReceive: true,
        message: `Connected to Microsoft 365 as ${user.mail || user.userPrincipalName}`,
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
    const client = await this.getGraphClient();
    const user = (await client.api('/me').get()) as { userPrincipalName?: string; mail?: string };
    return {
      email: user.mail || user.userPrincipalName || this.mailboxEmail,
      provider: 'MICROSOFT_GRAPH',
    };
  }
}
