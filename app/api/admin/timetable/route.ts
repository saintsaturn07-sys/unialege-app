import { assertSameOrigin, noStoreHeaders, requireAdmin } from "../../../lib/server-session";
import { getSupabaseAdmin } from "../../../lib/supabase-admin";
import { parseTimetableInput } from "./validation";

export async function GET() {
  if (!await requireAdmin()) return Response.json({ error: "Administrator sign-in required." }, { status: 401, headers: noStoreHeaders() });
  const { data, error } = await getSupabaseAdmin().from("timetable_entries").select("*").order("session", { ascending: false }).order("term").order("day_of_week").order("period");
  if (error) return Response.json({ error: "Unable to load timetable entries." }, { status: 500, headers: noStoreHeaders() });
  return Response.json({ entries: data ?? [] }, { headers: noStoreHeaders() });
}

export async function POST(request: Request) {
  if (!await requireAdmin()) return Response.json({ error: "Administrator sign-in required." }, { status: 401, headers: noStoreHeaders() });
  if (!assertSameOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403, headers: noStoreHeaders() });
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; } catch { return Response.json({ error: "Invalid timetable entry." }, { status: 400, headers: noStoreHeaders() }); }
  const entry = parseTimetableInput(body);
  if (!entry) return Response.json({ error: "Check the day, period, time, subject, class, stream, session, and term." }, { status: 400, headers: noStoreHeaders() });
  const db = getSupabaseAdmin();
  const id = typeof body.id === "string" ? body.id : "";
  const result = id
    ? await db.from("timetable_entries").update({ ...entry, updated_at: new Date().toISOString() }).eq("id", id).select("id").maybeSingle()
    : await db.from("timetable_entries").insert(entry).select("id").single();
  if (result.error?.code === "23505") return Response.json({ error: "That class already has an entry for this day and period." }, { status: 409, headers: noStoreHeaders() });
  if (result.error) return Response.json({ error: "Unable to save timetable entry." }, { status: 500, headers: noStoreHeaders() });
  if (!result.data) return Response.json({ error: "Timetable entry not found." }, { status: 404, headers: noStoreHeaders() });
  return Response.json({ id: result.data.id }, { status: id ? 200 : 201, headers: noStoreHeaders() });
}
