import { toZonedTime, format } from 'date-fns-tz';
import { addDays, setHours, setMinutes, setSeconds, isBefore, isAfter } from 'date-fns';

export interface InterpolationVariables {
  firstName?: string | null;
  lastName?: string | null;
  company?: string | null;
  jobTitle?: string | null;
  senderName?: string | null;
  aiPersonalization?: string | null;
  [key: string]: unknown;
}

/**
 * Replaces template tokens like {{firstName}}, {{company}}, {{aiPersonalization}}
 */
export function interpolateTemplate(template: string, vars: InterpolationVariables): string {
  if (!template) return '';
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    const val = vars[key];
    if (val !== undefined && val !== null && String(val).trim() !== '') {
      return String(val);
    }
    // Clean fallbacks for common missing variables
    if (key === 'firstName') return 'there';
    if (key === 'company') return 'your company';
    return '';
  });
}

export interface ScheduleConfig {
  timezone: string;
  startHour: number; // e.g. 9
  endHour: number;   // e.g. 17
  allowedDays: number[]; // 1 = Monday ... 7 = Sunday (or 0 = Sunday)
}

/**
 * Checks if the current time in the campaign's timezone falls within business hours and allowed days.
 */
export function isWithinSendingWindow(schedule: ScheduleConfig, nowUtc: Date = new Date()): boolean {
  try {
    const zonedNow = toZonedTime(nowUtc, schedule.timezone);
    const dayOfWeek = zonedNow.getDay(); // 0 = Sunday, 1 = Monday ... 6 = Saturday
    const adjustedDay = dayOfWeek === 0 ? 7 : dayOfWeek; // Normalize to 1-7 (Mon-Sun)

    if (!schedule.allowedDays.includes(adjustedDay)) {
      return false;
    }

    const currentHour = zonedNow.getHours();
    return currentHour >= schedule.startHour && currentHour < schedule.endHour;
  } catch (err) {
    console.warn(`[TIMEZONE_CHECK_ERROR] Invalid timezone "${schedule.timezone}", defaulting to true:`, err);
    return true;
  }
}

/**
 * Calculates the next valid send timestamp if the current time is outside the sending window.
 */
export function getNextAvailableSendTime(schedule: ScheduleConfig, fromUtc: Date = new Date()): Date {
  let target = new Date(fromUtc);

  // Look ahead up to 14 days to find the next valid sending window
  for (let i = 0; i < 14; i++) {
    const zoned = toZonedTime(target, schedule.timezone);
    const day = zoned.getDay() === 0 ? 7 : zoned.getDay();
    const isAllowedDay = schedule.allowedDays.includes(day);

    if (isAllowedDay) {
      const currentHour = zoned.getHours();
      if (currentHour < schedule.startHour) {
        // Schedule for startHour today in campaign timezone
        const windowOpen = setSeconds(setMinutes(setHours(zoned, schedule.startHour), 0), 0);
        return windowOpen;
      }
      if (currentHour < schedule.endHour) {
        return target; // Currently open
      }
    }

    // Move to next calendar day at startHour
    target = addDays(target, 1);
    const nextZoned = toZonedTime(target, schedule.timezone);
    target = setSeconds(setMinutes(setHours(nextZoned, schedule.startHour), 0), 0);
  }

  return addDays(fromUtc, 1);
}

/**
 * Generates a randomized jitter delay between min and max seconds.
 */
export function getRandomJitterSeconds(minSec: number = 60, maxSec: number = 300): number {
  const min = Math.max(10, minSec);
  const max = Math.max(min + 1, maxSec);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generates a unique idempotency key to prevent accidental duplicate sends.
 */
export function generateIdempotencyKey(campaignLeadId: string, stepNumber: number): string {
  return `send_${campaignLeadId}_step_${stepNumber}`;
}
