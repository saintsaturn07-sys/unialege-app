export const announcementCategories = ["Academic", "Examination", "School Event", "General", "Fees"] as const;
const classes = ["JSS 1", "JSS 2", "JSS 3", "SS 1", "SS 2", "SS 3"] as const;
const streams = ["science", "commercial", "art"] as const;

export function validateAnnouncement(body: Record<string, unknown>, username: string) {
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const category = typeof body.category === "string" && announcementCategories.includes(body.category as typeof announcementCategories[number]) ? body.category : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const details = typeof body.details === "string" ? body.details.trim() : "";
  const target_class = body.target_class === null || body.target_class === "" ? null : typeof body.target_class === "string" && classes.includes(body.target_class as typeof classes[number]) ? body.target_class : undefined;
  const target_stream = body.target_stream === null || body.target_stream === "" ? null : typeof body.target_stream === "string" && streams.includes(body.target_stream as typeof streams[number]) ? body.target_stream : undefined;
  const is_published = typeof body.is_published === "boolean" ? body.is_published : null;
  if (!title || title.length > 160 || !category || !description || description.length > 300 || !details || details.length > 10000 || target_class === undefined || target_stream === undefined || is_published === null) {
    throw new Error("Enter a title, category, summary, details, audience, and publication status within the allowed lengths.");
  }
  if (target_stream && (!target_class || !target_class.startsWith("SS "))) throw new Error("Choose an SS class before selecting a stream.");
  return { title, category, description, details, target_class, target_stream, is_published, published_at: is_published ? new Date().toISOString() : null, created_by: username };
}
