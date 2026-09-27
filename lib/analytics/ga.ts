/**
 * Google Analytics 4 (GA4) Integration Utility
 *
 * Privacy Guardrail:
 * Under NO circumstances should personally identifiable information (PII) such as
 * raw email addresses, lead names, email message contents, passwords, or API keys
 * be transmitted to Google Analytics.
 */

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

export const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_ID || '';

/**
 * Logs a page view event to GA4 if configured.
 */
export function trackPageView(url: string): void {
  if (typeof window === 'undefined' || !window.gtag || !GA_TRACKING_ID) return;
  window.gtag('config', GA_TRACKING_ID, {
    page_path: url,
  });
}

/**
 * Tracks an application event to GA4 with privacy scrubbing.
 */
export function trackEvent(
  eventName:
    | 'user_signed_up'
    | 'campaign_created'
    | 'campaign_launched'
    | 'campaign_paused'
    | 'mailbox_connected'
    | 'lead_imported'
    | 'ai_generation_used'
    | 'reply_received'
    | 'meeting_booked',
  params: Record<string, string | number | boolean> = {}
): void {
  if (typeof window === 'undefined' || !window.gtag || !GA_TRACKING_ID) {
    // In dev mode without GA, log neatly for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log(`[GA_EVENT_DEV] ${eventName}`, params);
    }
    return;
  }

  // Safety filter to prevent accidental PII leakage
  const safeParams: Record<string, string | number | boolean> = {};
  for (const [key, val] of Object.entries(params)) {
    if (
      key.toLowerCase().includes('email') ||
      key.toLowerCase().includes('password') ||
      key.toLowerCase().includes('secret') ||
      key.toLowerCase().includes('token') ||
      key.toLowerCase().includes('body') ||
      key.toLowerCase().includes('content')
    ) {
      continue; // Block PII fields
    }
    safeParams[key] = val;
  }

  window.gtag('event', eventName, safeParams);
}
