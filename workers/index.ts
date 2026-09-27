import dotenv from 'dotenv';
dotenv.config();

import { createEmailSenderWorker } from './email-sender.worker';
import { createMailboxSyncerWorker } from './mailbox-syncer.worker';
import { createAIInboxWorker } from './ai-inbox.worker';

console.log('==============================================');
console.log('🚀 AI Outreach OS - Background Worker Engine');
console.log('==============================================');

const emailWorker = createEmailSenderWorker();
const mailboxWorker = createMailboxSyncerWorker();
const aiWorker = createAIInboxWorker();

console.log('✔ Email Sending Worker initialized');
console.log('✔ Mailbox Synchronization Worker initialized');
console.log('✔ AI Inbox Classification Worker initialized');
console.log('✨ All background workers active and listening to Redis queues.');

async function shutdown() {
  console.log('\nGracefully shutting down background workers...');
  await Promise.all([
    emailWorker.close(),
    mailboxWorker.close(),
    aiWorker.close(),
  ]);
  console.log('All workers closed. Exiting process.');
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
