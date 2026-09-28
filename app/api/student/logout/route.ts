import { clearCookie, noStoreHeaders, STUDENT_COOKIE } from "../../../lib/server-session";

export async function POST() {
  await clearCookie(STUDENT_COOKIE);
  return Response.json({ ok: true }, { headers: noStoreHeaders() });
}
