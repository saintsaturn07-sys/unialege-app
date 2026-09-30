import { assertSameOrigin, noStoreHeaders, requireAdmin } from "../../../../lib/server-session";
import { getSupabaseAdmin } from "../../../../lib/supabase-admin";
type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, context: Context) {
  if (!await requireAdmin()) return Response.json({ error: "Administrator sign-in required." }, { status: 401, headers: noStoreHeaders() });
  if (!assertSameOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403, headers: noStoreHeaders() });
  const { id } = await context.params;
  let body: { is_active?: unknown };
  try { body = await request.json() as { is_active?: unknown }; } catch { return Response.json({ error: "Invalid fee update." }, { status: 400, headers: noStoreHeaders() }); }
  if (typeof body.is_active !== "boolean") return Response.json({ error: "Choose an active state." }, { status: 400, headers: noStoreHeaders() });
  const { data, error } = await getSupabaseAdmin().from("fee_items").update({ is_active: body.is_active }).eq("id", id).select("id, is_active").maybeSingle();
  if (error) return Response.json({ error: "Unable to update fee item." }, { status: 500, headers: noStoreHeaders() });
  if (!data) return Response.json({ error: "Fee item not found." }, { status: 404, headers: noStoreHeaders() });
  return Response.json({ fee_item: data }, { headers: noStoreHeaders() });
}
export async function DELETE(request: Request, context: Context) {
  if (!await requireAdmin()) return Response.json({ error: "Administrator sign-in required." }, { status: 401, headers: noStoreHeaders() });
  if (!assertSameOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403, headers: noStoreHeaders() });
  const { id } = await context.params;
  const { data, error } = await getSupabaseAdmin().from("fee_items").delete().eq("id", id).select("id").maybeSingle();
  if (error) return Response.json({ error: "This fee item has payment records or could not be deleted. Deactivate it instead." }, { status: 409, headers: noStoreHeaders() });
  if (!data) return Response.json({ error: "Fee item not found." }, { status: 404, headers: noStoreHeaders() });
  return Response.json({ ok: true }, { headers: noStoreHeaders() });
}
