import { assertSameOrigin, noStoreHeaders, requireAdmin } from "../../../../lib/server-session";
import { getSupabaseAdmin } from "../../../../lib/supabase-admin";

type Context = { params: Promise<{ id: string }> };
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
