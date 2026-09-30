import { assertSameOrigin, noStoreHeaders, requireAdmin } from "../../../../lib/server-session";
import { getSupabaseAdmin } from "../../../../lib/supabase-admin";

type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, context: Context) {
  if (!await requireAdmin()) return Response.json({ error: "Administrator sign-in required." }, { status: 401, headers: noStoreHeaders() });
  if (!assertSameOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403, headers: noStoreHeaders() });
  const { id } = await context.params;
  let body: { is_published?: unknown };
  try { body = await request.json() as { is_published?: unknown }; }
  catch { return Response.json({ error: "Invalid publication update." }, { status: 400, headers: noStoreHeaders() }); }
  if (typeof body.is_published !== "boolean") return Response.json({ error: "Choose whether to publish this result." }, { status: 400, headers: noStoreHeaders() });
  if (body.is_published) {
    const { data: existing, error: lookupError } = await getSupabaseAdmin().from("results").select("id, ca_recorded, assessment_type").eq("id", id).maybeSingle();
    if (lookupError) return Response.json({ error: "Unable to verify that both assessment scores are recorded." }, { status: 500, headers: noStoreHeaders() });
    if (!existing) return Response.json({ error: "Result not found." }, { status: 404, headers: noStoreHeaders() });
    if (existing.assessment_type !== "formal") return Response.json({ error: "Classify this as a formal academic result before publishing it." }, { status: 409, headers: noStoreHeaders() });
    if (!existing.ca_recorded) return Response.json({ error: "Enter and save the CA score before publishing this result." }, { status: 409, headers: noStoreHeaders() });
  }
  const { data, error } = await getSupabaseAdmin().from("results").update({ is_published: body.is_published }).eq("id", id).select("id, is_published").maybeSingle();
  if (error) return Response.json({ error: "Unable to update result publication." }, { status: 500, headers: noStoreHeaders() });
  if (!data) return Response.json({ error: "Result not found." }, { status: 404, headers: noStoreHeaders() });
  return Response.json({ result: data }, { headers: noStoreHeaders() });
}

export async function DELETE(request: Request, context: Context) {
  if (!await requireAdmin()) return Response.json({ error: "Administrator sign-in required." }, { status: 401, headers: noStoreHeaders() });
  if (!assertSameOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403, headers: noStoreHeaders() });
  const { id } = await context.params;
  const studentId = new URL(request.url).searchParams.get("studentId") ?? "";
  const { data, error } = await getSupabaseAdmin().from("results").delete().eq("id", id).eq("student_id", studentId).select("id").maybeSingle();
  if (error) return Response.json({ error: "Unable to delete result." }, { status: 500, headers: noStoreHeaders() });
  if (!data) return Response.json({ error: "Result not found." }, { status: 404, headers: noStoreHeaders() });
  return Response.json({ ok: true }, { headers: noStoreHeaders() });
}
