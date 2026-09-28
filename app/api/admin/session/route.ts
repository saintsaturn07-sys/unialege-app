import { noStoreHeaders, requireAdmin } from "../../../lib/server-session";

export async function GET() {
  const session = await requireAdmin();
  if (!session) return Response.json({ error: "Administrator sign-in required." }, { status: 401, headers: noStoreHeaders() });
  return Response.json({
    username: session.username,
    name: process.env.UNIALEGE_ADMIN_NAME ?? "School Administrator",
  }, { headers: noStoreHeaders() });
}
