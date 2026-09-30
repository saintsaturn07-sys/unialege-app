const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
const classes = ["JSS 1", "JSS 2", "JSS 3", "SS 1", "SS 2", "SS 3"] as const;
const terms = ["First Term", "Second Term", "Third Term"] as const;
const streams = ["science", "commercial", "art"] as const;
export type TimetableInput = { day_of_week: string; period: number; start_time: string; end_time: string; subject: string; teacher: string | null; class_name: string; target_stream: string | null; session: string; term: string };
export function parseTimetableInput(body: Record<string, unknown>): TimetableInput | null {
  const day = body.day_of_week;
  const className = typeof body.class_name === "string" ? body.class_name.trim() : "";
  const stream = body.target_stream === "" || body.target_stream === null || body.target_stream === undefined ? null : body.target_stream;
  const period = Number(body.period);
  const start = typeof body.start_time === "string" ? body.start_time : "";
  const end = typeof body.end_time === "string" ? body.end_time : "";
  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const teacher = typeof body.teacher === "string" ? body.teacher.trim() : "";
  const session = typeof body.session === "string" ? body.session.trim() : "";
  const term = typeof body.term === "string" ? body.term : "";
  if (!days.includes(day as (typeof days)[number]) || !classes.includes(className as (typeof classes)[number]) || !terms.includes(term as (typeof terms)[number])) return null;
  if (stream !== null && (!streams.includes(stream as (typeof streams)[number]) || !className.startsWith("SS "))) return null;
  if (!Number.isInteger(period) || period < 1 || period > 16 || !/^([01]\d|2[0-3]):[0-5]\d$/.test(start) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(end) || start >= end) return null;
  if (!subject || subject.length > 100 || teacher.length > 100 || session.length < 4 || session.length > 20) return null;
  return { day_of_week: day as string, period, start_time: start, end_time: end, subject, teacher: teacher || null, class_name: className, target_stream: stream as string | null, session, term };
}
