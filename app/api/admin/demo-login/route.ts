import { assertSameOrigin, setAdminCookie, noStoreHeaders } from "../../../lib/server-session";
import { timingSafeEqual } from "node:crypto";

// Credentials are configured only on the server; sessions are signed and
// verified server-side by the admin API routes.
const ADMIN_USERNAME = process.env.UNIALEGE_ADMIN_USERNAME ?? "";
const ADMIN_PASSWORD = process.env.UNIALEGE_ADMIN_PASSWORD ?? "";
const ADMIN_NAME = process.env.UNIALEGE_ADMIN_NAME ?? "School Administrator";

function constantTimeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!assertSameOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403, headers: noStoreHeaders() });
  let credentials: unknown;

  try {
    credentials = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  if (typeof credentials !== "object" || credentials === null) {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const body = credentials as Record<string, unknown>;
  const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!ADMIN_USERNAME || !ADMIN_PASSWORD) return Response.json({ error: "Administrator credentials are not configured." }, { status: 503, headers: noStoreHeaders() });
  if (!constantTimeEqual(username, ADMIN_USERNAME.trim().toLowerCase()) || !constantTimeEqual(password, ADMIN_PASSWORD)) {
    return Response.json({ error: "Incorrect administrator username or password." }, {
      status: 401,
      headers: { "Cache-Control": "no-store" },
    });
  }

  await setAdminCookie(ADMIN_USERNAME);
  return Response.json(
    { username: ADMIN_USERNAME, name: ADMIN_NAME },
    { headers: noStoreHeaders() },
  );
}
