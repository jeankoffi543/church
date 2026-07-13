import { apiFetch } from './client';
import type { ChurchEvent, LiveState } from '../types';

/**
 * A church's public API is served on its own hostname (CHR-186). React Native's
 * `fetch` has no CORS, so the Hub can call any church directly. In production the
 * domain is https; for local dev the churches live behind the API host by Host,
 * unreachable from the app — validate on a deployed/staging church.
 */
function churchOrigin(domain: string): string {
  return `https://${domain}`;
}

/** Live status of a church (from its public `settings?group=live`). */
export async function getLiveState(domain: string): Promise<LiveState> {
  const res = await apiFetch<{ data: Record<string, unknown> }>('/api/v1/public/settings?group=live', {
    origin: churchOrigin(domain),
  });
  const data = res?.data ?? {};
  return {
    isLive: Boolean(data.live_status),
    title: typeof data.live_title === 'string' ? data.live_title : null,
  };
}

/** A church's upcoming events. */
export async function getUpcomingEvents(domain: string): Promise<ChurchEvent[]> {
  const res = await apiFetch<{ data: ChurchEvent[] }>('/api/v1/public/events', { origin: churchOrigin(domain) });
  return Array.isArray(res?.data) ? res.data : [];
}
