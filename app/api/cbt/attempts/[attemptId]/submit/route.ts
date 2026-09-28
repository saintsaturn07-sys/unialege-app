import { assertSameOrigin, noStoreHeaders, requireStudent } from "../../../../../lib/server-session";
import { getSupabaseAdmin } from "../../../../../lib/supabase-admin";

type Context = { params: Promise<{ attemptId: string }> };
export async function POST(request: Request, context: Context) {
  const student = await requireStudent();
  if (!student) return Response.json({ error: "Student sign-in required." }, { status: 401, headers: noStoreHeaders() });
  if (!assertSameOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403, headers: noStoreHeaders() });
  const { data, error } = await getSupabaseAdmin().rpc("submit_cbt_attempt", { p_attempt_id: (await context.params).attemptId, p_student_id: student.id });
  if (error) {
    const alreadySubmitted = /already submitted/i.test(error.message);
    return Response.json({ error: alreadySubmitted ? "This attempt has already been submitted." : "Unable to submit this attempt." }, { status: alreadySubmitted ? 409 : 500, headers: noStoreHeaders() });
  }
  return Response.json({ result: data }, { headers: noStoreHeaders() });
}
