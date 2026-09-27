import { EmailProvider } from './provider.interface';
import { SmtpImapProvider } from './smtp-imap.provider';
import { GmailProvider } from './gmail.provider';
import { MicrosoftGraphProvider } from './microsoft-graph.provider';
import { MockEmailProvider } from './mock.provider';
import { decrypt } from '@/lib/security/crypto';
import { prisma } from '@/lib/db/prisma';
import {
  SmtpImapCredentials,
  GmailOAuthCredentials,
  MicrosoftGraphCredentials,
} from './types';

export interface MailboxRecord {
  id: string;
  email: string;
  providerType: 'SMTP_IMAP' | 'GMAIL' | 'MICROSOFT_GRAPH' | 'MOCK';
  encryptedCredentials: string;
}

export function createEmailProviderFromCredentials(
  providerType: string,
  email: string,
  credentialsJson: string
): EmailProvider {
  if (providerType === 'MOCK' || !credentialsJson) {
    return new MockEmailProvider(email);
  }

  let creds: Record<string, unknown>;
  try {
    const raw = decrypt(credentialsJson);
    creds = JSON.parse(raw);
  } catch (err) {
    console.warn(`[PROVIDER_FACTORY] Decryption failed, falling back to mock:`, err);
    return new MockEmailProvider(email);
  }

  switch (providerType) {
    case 'SMTP_IMAP':
      return new SmtpImapProvider(email, creds as unknown as SmtpImapCredentials);
    case 'GMAIL':
      return new GmailProvider(email, creds as unknown as GmailOAuthCredentials);
    case 'MICROSOFT_GRAPH':
      return new MicrosoftGraphProvider(email, creds as unknown as MicrosoftGraphCredentials);
    default:
      return new MockEmailProvider(email);
  }
}

export async function getEmailProviderForMailbox(mailboxId: string): Promise<EmailProvider> {
  const mailbox = await prisma.mailbox.findUnique({
    where: { id: mailboxId },
  });

  if (!mailbox) {
    throw new Error(`Mailbox with ID ${mailboxId} not found`);
  }

  return createEmailProviderFromCredentials(
    mailbox.providerType,
    mailbox.email,
    mailbox.encryptedCredentials
  );
}
