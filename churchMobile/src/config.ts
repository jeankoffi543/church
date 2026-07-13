/**
 * Central identity API origin (CHR-185). The mobile Hub talks to the landlord's
 * central `/api/identity/*` endpoints (auth, discovery, memberships) — resolved
 * by path, not by Host, so a fixed origin is correct.
 *
 * Dev defaults to the Android emulator's alias for the host machine (10.0.2.2).
 * For a physical device use your machine's LAN IP; for production the SaaS API.
 */
export const API_ORIGIN = 'http://10.0.2.2:8001';
