import { assertSameOrigin, noStoreHeaders, requireAdmin } from "../../../../lib/server-session";
import { getSupabaseAdmin } from "../../../../lib/supabase-admin";
import { validateAnnouncement } from "../validation";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  const admin = await requireAdmin();
  if (!admin) return Response.json({ error: "Administrator sign-in required." }, { status: 401, headers: noStoreHeaders() });
  if (!assertSameOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403, headers: noStoreHeaders() });
  const { id } = await context.params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return Response.json({ error: "Invalid announcement ID." }, { status: 400, headers: noStoreHeaders() });
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; } catch { return Response.json({ error: "Invalid announcement data." }, { status: 400, headers: noStoreHeaders() }); }
  try {
    const { created_by: _createdBy, ...record } = validateAnnouncement(body, admin.username);
    const db = getSupabaseAdmin();
    const { data: existing, error: lookupError } = await db.from("announcements").select("is_published, published_at").eq("id", id).maybeSingle();
    if (lookupError) return Response.json({ error: "Unable to update announcement." }, { status: 500, headers: noStoreHeaders() });
    if (!existing) return Response.json({ error: "Announcement not found." }, { status: 404, headers: noStoreHeaders() });
    const published_at = record.is_published ? (existing.is_published ? existing.published_at : new Date().toISOString()) : null;
    const { data, error } = await db.from("announcements").update({ ...record, published_at, updated_at: new Date().toISOString() }).eq("id", id).select("*").maybeSingle();
    if (error) return Response.json({ error: "Unable to update announcement." }, { status: 500, headers: noStoreHeaders() });
    if (!data) return Response.json({ error: "Announcement not found." }, { status: 404, headers: noStoreHeaders() });
    return Response.json({ announcement: data }, { headers: noStoreHeaders() });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Invalid announcement data." }, { status: 400, headers: noStoreHeaders() }); }
}

export async function DELETE(request: Request, context: Context) {
  if (!await requireAdmin()) return Response.json({ error: "Administrator sign-in required." }, { status: 401, headers: noStoreHeaders() });
  if (!assertSameOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403, headers: noStoreHeaders() });
  const { id } = await context.params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return Response.json({ error: "Invalid announcement ID." }, { status: 400, headers: noStoreHeaders() });
  const { data, error } = await getSupabaseAdmin().from("announcements").delete().eq("id", id).select("id").maybeSingle();
  if (error) return Response.json({ error: "Unable to delete announcement." }, { status: 500, headers: noStoreHeaders() });
  if (!data) return Response.json({ error: "Announcement not found." }, { status: 404, headers: noStoreHeaders() });
  return Response.json({ success: true }, { headers: noStoreHeaders() });
}
