import { describe, it, expect } from 'vitest';
import {
  isWithinSendingWindow,
  getNextAvailableSendTime,
  getRandomJitterSeconds,
  generateIdempotencyKey,
  interpolateTemplate,
} from '@/lib/campaigns/sequence-engine';

describe('Sequence Engine & Scheduling', () => {
  const scheduleConfig = {
    timezone: 'UTC',
    startHour: 9,
    endHour: 17,
    allowedDays: [1, 2, 3, 4, 5], // Monday - Friday
  };

  it('should return true when time is within business hours on a weekday', () => {
    // 2026-10-05 is a Monday at 14:00 UTC
    const monday2pm = new Date('2026-10-05T14:00:00Z');
    expect(isWithinSendingWindow(scheduleConfig, monday2pm)).toBe(true);
  });

  it('should return false on weekends', () => {
    // 2026-10-04 is a Sunday at 14:00 UTC
    const sunday2pm = new Date('2026-10-04T14:00:00Z');
    expect(isWithinSendingWindow(scheduleConfig, sunday2pm)).toBe(false);
  });

  it('should return false before business hours', () => {
    // Monday at 06:00 UTC
    const monday6am = new Date('2026-10-05T06:00:00Z');
    expect(isWithinSendingWindow(scheduleConfig, monday6am)).toBe(false);
  });

  it('should compute next available send window', () => {
    // Sunday 14:00 UTC -> should calculate next window opening
    const sunday2pm = new Date('2026-10-04T14:00:00Z');
    const nextWindow = getNextAvailableSendTime(scheduleConfig, sunday2pm);
    expect(nextWindow).toBeDefined();
    expect(nextWindow.getTime()).toBeGreaterThan(sunday2pm.getTime());
  });

  it('should interpolate template tokens with fallback defaults', () => {
    const template = 'Hi {{firstName}}, how is everything at {{company}}? Best, {{senderName}}';
    const interpolated = interpolateTemplate(template, {
      firstName: 'Michael',
      company: 'Acme Health',
      senderName: 'Alex',
    });

    expect(interpolated).toBe('Hi Michael, how is everything at Acme Health? Best, Alex');

    // Missing variables fallback test
    const fallbackInterpolated = interpolateTemplate('Hi {{firstName}} at {{company}}', {});
    expect(fallbackInterpolated).toBe('Hi there at your company');
  });

  it('should generate deterministic unique idempotency keys', () => {
    const key1 = generateIdempotencyKey('lead-123', 1);
    const key2 = generateIdempotencyKey('lead-123', 1);
    const key3 = generateIdempotencyKey('lead-123', 2);

    expect(key1).toBe('send_lead-123_step_1');
    expect(key1).toEqual(key2);
    expect(key1).not.toEqual(key3);
  });

  it('should generate randomized jitter within limits', () => {
    const jitter = getRandomJitterSeconds(120, 300);
    expect(jitter).toBeGreaterThanOrEqual(120);
    expect(jitter).toBeLessThanOrEqual(300);
  });
});
