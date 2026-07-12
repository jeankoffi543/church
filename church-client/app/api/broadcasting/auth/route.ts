import type { NextRequest } from "next/server";

import { getAdminSession } from "@/lib/auth/session";
import { tenantApiBase } from "@/lib/tenant/api-base";

// CHR-157 — same-origin proxy that authenticates Echo private/presence channel
// subscriptions. The admin's Sanctum token lives in an httpOnly cookie the browser
// JS cannot read, so Echo POSTs its {channel_name, socket_id} here; we inject the
// Bearer token server-side and forward to the tenant backend's /broadcasting/auth
// (which resolves the user on the tenant DB and signs the response). The current
// request host makes the upstream tenant-correct, and the token never touches the
// client. Public channels never hit this route.
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<Response> {
  const session = await getAdminSession();
  if (!session?.token) {
    return new Response("Unauthorized", { status: 401 });
  }

  // `/broadcasting/auth` lives at the backend root, not under /api/v1 — take the
  // tenant base's origin (its host resolves the church for Laravel).
  let origin: string;
  try {
    origin = new URL(await tenantApiBase()).origin;
  } catch {
    return new Response("Bad gateway", { status: 502 });
  }

  const body = await request.text();

  let upstream: Response;
  try {
    upstream = await fetch(`${origin}/broadcasting/auth`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.token}`,
        "Content-Type": request.headers.get("content-type") ?? "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body,
      cache: "no-store",
    });
  } catch {
    return new Response("Bad gateway", { status: 502 });
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" },
  });
}
