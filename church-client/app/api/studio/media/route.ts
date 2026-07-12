import { getAdminSession } from "@/lib/auth/session";
import { tenantApiBase } from "@/lib/tenant/api-base";

/**
 * Streaming upload proxy for Live Studio media (video / image). The browser XHRs
 * the file here (so it can report upload progress), and this handler forwards the
 * multipart body straight through to the Laravel API with the admin token — the
 * token never leaves the server. The body is streamed (never buffered) so large
 * videos don't blow up memory.
 */
export async function POST(req: Request): Promise<Response> {
  // Custom-header guard: a cross-site form can't set this without a CORS
  // preflight (which this route doesn't grant), blocking CSRF uploads.
  if (req.headers.get("x-studio-upload") !== "1") {
    return Response.json({ message: "Requête non autorisée." }, { status: 403 });
  }

  const session = await getAdminSession();
  if (!session?.token) {
    return Response.json({ message: "Session expirée." }, { status: 401 });
  }

  const upstream = await fetch(`${await tenantApiBase()}/admin/studio/media`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.token}`,
      Accept: "application/json",
      "Content-Type": req.headers.get("content-type") ?? "application/octet-stream",
    },
    body: req.body,
    // Streaming a request body requires half duplex (not yet in the TS types).
    duplex: "half",
  } as RequestInit & { duplex: "half" });

  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: { "Content-Type": "application/json" },
  });
}
