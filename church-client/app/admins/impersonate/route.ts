import { type NextRequest, NextResponse } from "next/server";

import { ADMIN_COOKIE, ADMIN_HOME_PATH, ADMIN_LOGIN_PATH } from "@/lib/auth/config";

const THIRTY_MINUTES = 60 * 30;

/**
 * Platform impersonation handshake (CHR-183). The super-admin console mints a
 * short-lived tenant admin token and opens this URL on the church's own domain;
 * we set the admin session cookie (same-origin for the tenant) and hand off to
 * the dashboard. Reachable without a session (PUBLIC_ADMIN_PATHS).
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL(`${ADMIN_LOGIN_PATH}?error=invalid`, request.url));
  }

  const response = NextResponse.redirect(new URL(ADMIN_HOME_PATH, request.url));
  response.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: THIRTY_MINUTES,
  });

  return response;
}
