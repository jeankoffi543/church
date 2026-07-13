import { apiFetch } from './client';
import type { Identity, Church, Membership } from '../types';

const DEVICE_NAME = 'churchMobile';

/** CHR-165 — register a global churchgoer identity. */
export function register(input: {
  name: string;
  email: string;
  phone?: string;
  password: string;
}): Promise<{ token: string; identity: Identity }> {
  return apiFetch('/api/identity/register', { method: 'POST', body: { ...input, device_name: DEVICE_NAME } });
}

/** CHR-165 — sign in an identity, returning a bearer token. */
export function login(email: string, password: string): Promise<{ token: string; identity: Identity }> {
  return apiFetch('/api/identity/login', { method: 'POST', body: { email, password, device_name: DEVICE_NAME } });
}

/** The current identity for a stored token (used to validate it on boot). */
export async function fetchMe(token: string): Promise<Identity> {
  const res = await apiFetch<{ data: Identity }>('/api/identity/me', { token });
  return res.data;
}

export function logout(token: string): Promise<{ message: string }> {
  return apiFetch('/api/identity/logout', { method: 'POST', token });
}

/** CHR-168 — search active churches, flagged with whether we already follow them. */
export async function discoverChurches(token: string, query = ''): Promise<Church[]> {
  const suffix = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : '';
  const res = await apiFetch<{ data: Church[] }>(`/api/identity/discover${suffix}`, { token });
  return res.data;
}

/** CHR-166 — follow a church (creates a Follower membership). */
export function followChurch(token: string, tenantId: string): Promise<{ data: Membership }> {
  return apiFetch(`/api/identity/memberships/${tenantId}/follow`, { method: 'POST', body: {}, token });
}

/** CHR-166 — stop following a church. */
export function unfollowChurch(token: string, tenantId: string): Promise<{ message: string }> {
  return apiFetch(`/api/identity/memberships/${tenantId}`, { method: 'DELETE', token });
}

/** CHR-166 — the churches this identity follows. */
export async function getMemberships(token: string): Promise<Membership[]> {
  const res = await apiFetch<{ data: Membership[] }>('/api/identity/memberships', { token });
  return res.data;
}

/** CHR-168/187 — register this device's push token for a followed church. */
export function registerDevice(
  token: string,
  tenantId: string,
  deviceToken: string,
  platform: 'ios' | 'android',
  topics?: string[],
): Promise<unknown> {
  return apiFetch(`/api/identity/memberships/${tenantId}/device`, {
    method: 'POST',
    token,
    body: { device_token: deviceToken, platform, topics },
  });
}

/** CHR-168/187 — drop every subscription for a device token (on sign-out). */
export function forgetDevice(token: string, deviceToken: string): Promise<{ removed: number }> {
  return apiFetch('/api/identity/devices/forget', { method: 'POST', token, body: { device_token: deviceToken } });
}

/** CHR-171/187 — mark a campaign opened when the notification is tapped. */
export function markPushOpened(
  token: string,
  tenantId: string,
  campaignId: number,
  deviceToken: string,
): Promise<{ opened: boolean }> {
  return apiFetch(`/api/identity/churches/${tenantId}/push/opened`, {
    method: 'POST',
    token,
    body: { campaign_id: campaignId, device_token: deviceToken },
  });
}
