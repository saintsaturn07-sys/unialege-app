import { assertSameOrigin, noStoreHeaders, requireAdmin } from "../../../lib/server-session";
import { getSupabaseAdmin } from "../../../lib/supabase-admin";

const classes = ["JSS 1", "JSS 2", "JSS 3", "SS 1", "SS 2", "SS 3"];
const terms = ["First Term", "Second Term", "Third Term"];
const streams = ["science", "commercial", "art"];
export async function GET() {
  if (!await requireAdmin()) return Response.json({ error: "Administrator sign-in required." }, { status: 401, headers: noStoreHeaders() });
  const { data, error } = await getSupabaseAdmin().from("fee_items").select("*").order("session", { ascending: false }).order("term").order("name");
  if (error) return Response.json({ error: "Unable to load fee items." }, { status: 500, headers: noStoreHeaders() });
  return Response.json({ fee_items: data ?? [] }, { headers: noStoreHeaders() });
}
export async function POST(request: Request) {
  if (!await requireAdmin()) return Response.json({ error: "Administrator sign-in required." }, { status: 401, headers: noStoreHeaders() });
  if (!assertSameOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403, headers: noStoreHeaders() });
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; } catch { return Response.json({ error: "Invalid fee item." }, { status: 400, headers: noStoreHeaders() }); }
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const amountDue = Number(body.amount_due);
  const targetClass = typeof body.target_class === "string" && body.target_class ? body.target_class : null;
  const targetStream = typeof body.target_stream === "string" && body.target_stream ? body.target_stream : null;
  const session = typeof body.session === "string" ? body.session.trim() : "";
  const term = typeof body.term === "string" ? body.term : "";
  const id = typeof body.id === "string" ? body.id : "";
  if (!name || name.length > 120 || !Number.isFinite(amountDue) || amountDue < 0 || amountDue > 100_000_000 || (targetClass && !classes.includes(targetClass)) || (targetStream && (!streams.includes(targetStream) || !targetClass?.startsWith("SS "))) || session.length < 4 || session.length > 20 || !terms.includes(term)) {
    return Response.json({ error: "Enter a valid fee name, amount, class/stream, session, and term." }, { status: 400, headers: noStoreHeaders() });
  }
  const db = getSupabaseAdmin();
  const values = { name, amount_due: amountDue, target_class: targetClass, target_stream: targetStream, session, term };
  const result = id
    ? await db.from("fee_items").update(values).eq("id", id).select("id").maybeSingle()
    : await db.from("fee_items").insert(values).select("id").single();
  if (result.error) return Response.json({ error: "Unable to save fee item." }, { status: 500, headers: noStoreHeaders() });
  if (!result.data) return Response.json({ error: "Fee item not found." }, { status: 404, headers: noStoreHeaders() });
  return Response.json({ id: result.data.id }, { status: id ? 200 : 201, headers: noStoreHeaders() });
}
