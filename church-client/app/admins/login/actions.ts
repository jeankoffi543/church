"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  ADMIN_COOKIE,
  ADMIN_HOME_PATH,
  ADMIN_LOGIN_PATH,
} from "@/lib/auth/config";

const ONE_DAY_SECONDS = 60 * 60 * 24;

export async function loginAdmin(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const from = String(formData.get("from") ?? "");

  if (!email || !password) {
    redirect(`${ADMIN_LOGIN_PATH}?error=missing`);
  }

  let redirectTo: string | null = null;

  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
    const response = await fetch(`${apiUrl}/admin/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
        device_name: "admin-backoffice",
      }),
    });

    if (!response.ok) {
      redirectTo = `${ADMIN_LOGIN_PATH}?error=invalid`;
    } else {
      const data = await response.json();
      const token = data.token;

      if (!token) {
        redirectTo = `${ADMIN_LOGIN_PATH}?error=invalid`;
      } else {
        (await cookies()).set(ADMIN_COOKIE, token, {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          path: "/",
          maxAge: ONE_DAY_SECONDS,
        });
        redirectTo = from.startsWith("/admins/") ? from : ADMIN_HOME_PATH;
      }
    }
  } catch (error) {
    console.error("Admin login API connection error:", error);
    redirectTo = `${ADMIN_LOGIN_PATH}?error=invalid`;
  }

  if (redirectTo) {
    redirect(redirectTo);
  }
}

/** Clears the admin session and returns to the login screen. */
export async function logoutAdmin() {
  const session = await cookies();
  const token = session.get(ADMIN_COOKIE)?.value;

  if (token) {
    try {
      // Call Laravel logout endpoint to revoke token
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
      await fetch(`${apiUrl}/admin/logout`, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      });
    } catch (error) {
      console.error("Admin logout API connection error:", error);
    }
  }

  session.delete(ADMIN_COOKIE);
  redirect(ADMIN_LOGIN_PATH);
}
