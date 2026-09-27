import { Queue } from 'bullmq';
import { redisConnection } from './redis';

export const EMAIL_SEND_QUEUE = 'email-send-queue';
export const MAILBOX_SYNC_QUEUE = 'mailbox-sync-queue';
export const AI_REPLY_QUEUE = 'ai-reply-queue';
export const LEAD_IMPORT_QUEUE = 'lead-import-queue';

function createLazyQueue(name: string, defaultJobOptions: Record<string, unknown> = {}): Queue {
  let instance: Queue | null = null;

  return new Proxy({} as Queue, {
    get(_, prop: string | symbol) {
      if (!instance) {
        instance = new Queue(name, {
          connection: redisConnection,
          defaultJobOptions,
        });
      }
      const val = (instance as any)[prop];
      if (typeof val === 'function') {
        return val.bind(instance);
      }
      return val;
    },
  });
}

export const emailSendQueue = createLazyQueue(EMAIL_SEND_QUEUE, {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },
  removeOnComplete: true,
  removeOnFail: false,
});

export const mailboxSyncQueue = createLazyQueue(MAILBOX_SYNC_QUEUE, {
  attempts: 2,
  removeOnComplete: true,
});

export const aiReplyQueue = createLazyQueue(AI_REPLY_QUEUE, {
  attempts: 3,
  removeOnComplete: true,
});

export const leadImportQueue = createLazyQueue(LEAD_IMPORT_QUEUE, {
  attempts: 2,
  removeOnComplete: true,
});
