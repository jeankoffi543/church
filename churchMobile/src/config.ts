/**
 * Central identity API origin (CHR-185). The mobile Hub talks to the landlord's
 * central `/api/identity/*` endpoints (auth, discovery, memberships) — resolved
 * by path, not by Host, so a fixed origin is correct.
 *
 * Dev defaults to the Android emulator's alias for the host machine (10.0.2.2).
 * For a physical device use your machine's LAN IP; for production the SaaS API.
 */
export const API_ORIGIN = 'http://10.0.2.2:8001';

/**
 * Shared platform Reverb server for live broadcasts (CHR-188). One server for
 * all churches — isolation is by tenant-scoped channel name (CHR-155). Dev host
 * is the Android-emulator alias; set the real host/key/scheme for production.
 */
export const REVERB = {
  key: 'grrjzlhdqftci40jh60e',
  host: '10.0.2.2',
  port: 8080,
  scheme: 'ws' as 'ws' | 'wss',
};
