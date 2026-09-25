// TEMPORARY DEMO AUTHENTICATION. Replace this fixed credential check with a
// real server-side identity provider before using UniAllege with school accounts.
const DEMO_ADMIN = {
  username: "admin@unialege.edu",
  password: "AdminDemo!2026",
  name: "School Administrator",
} as const;

export async function POST(request: Request) {
  let credentials: unknown;

  try {
    credentials = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  if (typeof credentials !== "object" || credentials === null) {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const body = credentials as Record<string, unknown>;
  const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (username !== DEMO_ADMIN.username || password !== DEMO_ADMIN.password) {
    return Response.json({ error: "Incorrect administrator username or password." }, {
      status: 401,
      headers: { "Cache-Control": "no-store" },
    });
  }

  return Response.json(
    { username: DEMO_ADMIN.username, name: DEMO_ADMIN.name },
    { headers: { "Cache-Control": "no-store" } },
  );
}
