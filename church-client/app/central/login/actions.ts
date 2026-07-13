"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { PLATFORM_COOKIE, CENTRAL_LOGIN_PATH, PLATFORM_HOME_PATH } from "@/lib/auth/config";

const API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/api\/v1\/?$/, "");
const ONE_DAY_SECONDS = 60 * 60 * 24;

/** Sign a platform staff member into the super-admin console (CHR-182). */
export async function loginPlatform(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect(`${CENTRAL_LOGIN_PATH}?error=missing`);
  }

  let redirectTo = `${CENTRAL_LOGIN_PATH}?error=invalid`;

  try {
    const response = await fetch(`${API_ORIGIN}/api/platform/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ email, password, device_name: "platform-console" }),
    });

    if (response.ok) {
      const data = (await response.json()) as { token?: string };
      if (data.token) {
        (await cookies()).set(PLATFORM_COOKIE, data.token, {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          path: "/",
          maxAge: ONE_DAY_SECONDS,
        });
        redirectTo = PLATFORM_HOME_PATH;
      }
    }
  } catch (error) {
    console.error("Platform login connection error:", error);
  }

  redirect(redirectTo);
}

/** Clears the platform session and returns to the central login. */
export async function logoutPlatform() {
  const token = (await cookies()).get(PLATFORM_COOKIE)?.value;

  if (token) {
    try {
      await fetch(`${API_ORIGIN}/api/platform/logout`, {
        method: "POST",
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      });
    } catch {
      // best-effort revoke
    }
  }

  (await cookies()).delete(PLATFORM_COOKIE);
  redirect(CENTRAL_LOGIN_PATH);
}
