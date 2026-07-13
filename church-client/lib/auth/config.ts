// Central auth configuration shared by the middleware (edge runtime) and the
// server components / actions. Keep this file free of Node-only APIs
// (e.g. `next/headers`) so it stays importable from the middleware.

/** Cookie holding the administrator session identifier / token. */
export const ADMIN_COOKIE = "mfm_admin_session";
/** Cookie holding the standard user session identifier / token. */
export const USER_COOKIE = "mfm_user_session";
/** Cookie holding the platform ("landlord") staff session token (CHR-182). */
export const PLATFORM_COOKIE = "mfm_platform_session";

/** Every admin route lives under this prefix. */
export const ADMIN_PREFIX = "/admins";
/** Where unauthenticated admins are sent. */
export const ADMIN_LOGIN_PATH = "/admins/login";
/** Where unauthenticated standard users are sent. */
export const USER_LOGIN_PATH = "/login";
/** Default landing page once an admin is authenticated. */
export const ADMIN_HOME_PATH = "/admins/dashboard";
/** Platform impersonation handshake — sets the admin cookie from a token (CHR-183). */
export const ADMIN_IMPERSONATE_PATH = "/admins/impersonate";

/** Admin routes reachable WITHOUT an admin session (auth screens + handshake). */
export const PUBLIC_ADMIN_PATHS = [ADMIN_LOGIN_PATH, ADMIN_IMPERSONATE_PATH];

/** Standard user routes that require a user session. */
export const PROTECTED_USER_PREFIXES = ["/dashboard", "/profile"];

/** Platform super-admin console (central hosts only, CHR-182/183). */
export const PLATFORM_CONSOLE_PREFIX = "/central/admin";
/** Where unauthenticated platform staff are sent. */
export const CENTRAL_LOGIN_PATH = "/central/login";
/** Default landing once platform staff are authenticated. */
export const PLATFORM_HOME_PATH = "/central/admin";

/** True for anything under the platform console. */
export function isPlatformConsolePath(pathname: string): boolean {
  return matchesPrefix(pathname, PLATFORM_CONSOLE_PREFIX);
}

const matchesPrefix = (pathname: string, prefix: string) =>
  pathname === prefix || pathname.startsWith(prefix + "/");

/** True for anything under `/admins` (including `/admins` itself). */
export function isAdminPath(pathname: string): boolean {
  return matchesPrefix(pathname, ADMIN_PREFIX);
}

/** True for admin routes that must stay public (login, etc.). */
export function isPublicAdminPath(pathname: string): boolean {
  return PUBLIC_ADMIN_PATHS.some((p) => matchesPrefix(pathname, p));
}

/** True for standard user routes that require authentication. */
export function isProtectedUserPath(pathname: string): boolean {
  return PROTECTED_USER_PREFIXES.some((p) => matchesPrefix(pathname, p));
}
