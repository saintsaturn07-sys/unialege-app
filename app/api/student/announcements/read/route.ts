import { assertSameOrigin, noStoreHeaders, requireStudent } from "../../../../lib/server-session";
import { getSupabaseAdmin } from "../../../../lib/supabase-admin";

type AnnouncementTarget = { id: string; target_class: string | null; target_stream: string | null };
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function visibleToStudent(item: AnnouncementTarget, student: { class_name: string; field_of_study: string | null }) {
  return (item.target_class === null || item.target_class === student.class_name)
    && (item.target_stream === null || item.target_stream === student.field_of_study);
}

async function getVisibleAnnouncements(student: { class_name: string; field_of_study: string | null }) {
  const { data, error } = await getSupabaseAdmin().from("announcements")
    .select("id, target_class, target_stream")
    .eq("is_published", true);
  if (error) return { announcements: null, error };
  return { announcements: (data ?? []).filter((item) => visibleToStudent(item, student)), error: null };
}

async function getUnreadCount(studentId: string, visibleIds: string[]) {
  if (visibleIds.length === 0) return { count: 0, error: null };
  const { data, error } = await getSupabaseAdmin().from("student_announcement_reads")
    .select("announcement_id")
    .eq("student_id", studentId)
    .in("announcement_id", visibleIds);
  return { count: error ? null : visibleIds.length - (data ?? []).length, error };
}

export async function POST(request: Request) {
  const student = await requireStudent();
  if (!student) return Response.json({ error: "Student sign-in required." }, { status: 401, headers: noStoreHeaders() });
  if (!assertSameOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403, headers: noStoreHeaders() });

  let body: { announcement_id?: unknown; mark_all?: unknown };
  try { body = await request.json() as typeof body; }
  catch { return Response.json({ error: "Invalid read status request." }, { status: 400, headers: noStoreHeaders() }); }

  const db = getSupabaseAdmin();
  if (body.mark_all === true && body.announcement_id === undefined) {
    const { announcements, error } = await getVisibleAnnouncements(student);
    if (error || !announcements) return Response.json({ error: "Unable to load announcements." }, { status: 500, headers: noStoreHeaders() });
    if (announcements.length > 0) {
      const records = announcements.map((item) => ({ student_id: student.id, announcement_id: item.id }));
      const { error: writeError } = await db.from("student_announcement_reads")
        .upsert(records, { onConflict: "student_id,announcement_id", ignoreDuplicates: true });
      if (writeError) return Response.json({ error: "Unable to update announcement read status." }, { status: 500, headers: noStoreHeaders() });
    }
    return Response.json({ success: true, unread_count: 0 }, { headers: noStoreHeaders() });
  }

  if (body.mark_all !== undefined || typeof body.announcement_id !== "string" || !uuidPattern.test(body.announcement_id)) {
    return Response.json({ error: "Invalid announcement read request." }, { status: 400, headers: noStoreHeaders() });
  }

  const { data: item, error: lookupError } = await db.from("announcements")
    .select("id, target_class, target_stream")
    .eq("id", body.announcement_id)
    .eq("is_published", true)
    .maybeSingle();
  if (lookupError) return Response.json({ error: "Unable to update announcement read status." }, { status: 500, headers: noStoreHeaders() });
  if (!item || !visibleToStudent(item, student)) {
    return Response.json({ error: "Announcement not found." }, { status: 404, headers: noStoreHeaders() });
  }

  const { error: writeError } = await db.from("student_announcement_reads")
    .upsert({ student_id: student.id, announcement_id: item.id }, { onConflict: "student_id,announcement_id", ignoreDuplicates: true });
  if (writeError) return Response.json({ error: "Unable to update announcement read status." }, { status: 500, headers: noStoreHeaders() });
  const { announcements, error: visibleError } = await getVisibleAnnouncements(student);
  if (visibleError || !announcements) return Response.json({ error: "Unable to load announcements." }, { status: 500, headers: noStoreHeaders() });
  const { count, error: countError } = await getUnreadCount(student.id, announcements.map((announcement) => announcement.id));
  if (countError || count === null) return Response.json({ error: "Unable to load announcement read status." }, { status: 500, headers: noStoreHeaders() });
  return Response.json({ success: true, unread_count: count }, { headers: noStoreHeaders() });
}
