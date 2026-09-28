import { clearCookie, ADMIN_COOKIE, noStoreHeaders } from "../../../lib/server-session";

export async function POST() {
  await clearCookie(ADMIN_COOKIE);
  return Response.json({ ok: true }, { headers: noStoreHeaders() });
}
