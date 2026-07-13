import { apiFetch } from './client';
import type { ChatMessage, ChurchEvent, DonationInit, DonationStatusResult, LiveState, Reaction } from '../types';

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

/** CHR-155/188 — the tenant-scoped channel prefix for this church's Reverb channel. */
export async function getRealtimePrefix(domain: string): Promise<string> {
  const res = await apiFetch<{ data: { channel_prefix: string } }>('/api/v1/public/realtime', {
    origin: churchOrigin(domain),
  });
  return res?.data?.channel_prefix ?? '';
}

/** Recent live chat history for a church. */
export async function getLiveMessages(domain: string): Promise<ChatMessage[]> {
  const res = await apiFetch<{ data: ChatMessage[] }>('/api/v1/public/live/chat', { origin: churchOrigin(domain) });
  return Array.isArray(res?.data) ? res.data : [];
}

/** Post a chat message to a church's live (it comes back over the channel). */
export async function sendChatMessage(domain: string, authorName: string, message: string): Promise<ChatMessage> {
  const res = await apiFetch<{ data: ChatMessage }>('/api/v1/public/live/chat', {
    origin: churchOrigin(domain),
    method: 'POST',
    body: { author_name: authorName, message },
  });
  return res.data;
}

/** Send a live reaction (heart | flame | hands | dove | crown). */
export async function sendReaction(domain: string, type: string): Promise<Reaction> {
  const res = await apiFetch<{ data: Reaction }>('/api/v1/public/live/react', {
    origin: churchOrigin(domain),
    method: 'POST',
    body: { type },
  });
  return res.data;
}

/** CHR-189 — open a Paystack donation for a church; returns the inline params. */
export async function initializeDonation(
  domain: string,
  payload: {
    donor_name: string;
    donor_email: string;
    donor_phone?: string;
    purpose_key: string;
    amount: number;
    frequency: 'unique' | 'mensuel';
    currency?: string;
  },
): Promise<DonationInit> {
  const res = await apiFetch<{ data: DonationInit }>('/api/v1/public/donations/initialize', {
    origin: churchOrigin(domain),
    method: 'POST',
    body: payload,
  });
  return res.data;
}

/** CHR-189 — poll a donation's accounting status after checkout. */
export async function getDonationStatus(domain: string, reference: string): Promise<DonationStatusResult> {
  const res = await apiFetch<{ data: DonationStatusResult }>(`/api/v1/public/donations/${reference}/status`, {
    origin: churchOrigin(domain),
  });
  return res.data;
}
