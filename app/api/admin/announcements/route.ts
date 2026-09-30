import { assertSameOrigin, noStoreHeaders, requireAdmin } from "../../../lib/server-session";
import { getSupabaseAdmin } from "../../../lib/supabase-admin";
import { validateAnnouncement } from "./validation";
type Input = Record<string, unknown>;

export async function GET() {
  if (!await requireAdmin()) return Response.json({ error: "Administrator sign-in required." }, { status: 401, headers: noStoreHeaders() });
  const { data, error } = await getSupabaseAdmin().from("announcements").select("*").order("created_at", { ascending: false });
  if (error) return Response.json({ error: "Unable to load announcements." }, { status: 500, headers: noStoreHeaders() });
  return Response.json({ announcements: data ?? [] }, { headers: noStoreHeaders() });
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return Response.json({ error: "Administrator sign-in required." }, { status: 401, headers: noStoreHeaders() });
  if (!assertSameOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403, headers: noStoreHeaders() });
  let body: Input;
  try { body = await request.json() as Input; } catch { return Response.json({ error: "Invalid announcement data." }, { status: 400, headers: noStoreHeaders() }); }
  try {
    const record = validateAnnouncement(body, admin.username);
    const { data, error } = await getSupabaseAdmin().from("announcements").insert(record).select("*").single();
    if (error) return Response.json({ error: "Unable to create announcement." }, { status: 500, headers: noStoreHeaders() });
    return Response.json({ announcement: data }, { status: 201, headers: noStoreHeaders() });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Invalid announcement data." }, { status: 400, headers: noStoreHeaders() }); }
}
