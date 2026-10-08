import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createEmailConfirmationClient, EMAIL_CHANGE_VERIFIER_COOKIE, getPublicAppOrigin } from "../../lib/email-confirmation";

function confirmationRedirect(requestUrl: string, status: "success" | "error") {
  const url = new URL("/auth/confirm/result", getPublicAppOrigin(requestUrl));
  url.searchParams.set("status", status);
  const response = NextResponse.redirect(url, 303);
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

export async function GET(request: Request) {
  const callback = new URL(request.url);
  const cookieStore = await cookies();

  if (callback.searchParams.has("error") || callback.searchParams.has("error_description") || callback.searchParams.has("error_code")) {
    cookieStore.set(EMAIL_CHANGE_VERIFIER_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/auth/confirm", maxAge: 0 });
    return confirmationRedirect(request.url, "error");
  }

  const code = callback.searchParams.get("code");
  if (!code || code.length > 4096 || !cookieStore.get(EMAIL_CHANGE_VERIFIER_COOKIE)?.value) {
    cookieStore.set(EMAIL_CHANGE_VERIFIER_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/auth/confirm", maxAge: 0 });
    return confirmationRedirect(request.url, "error");
  }

  try {
    const auth = createEmailConfirmationClient(cookieStore);
    const { data, error } = await auth.auth.exchangeCodeForSession(code);
    if (error || !data.user) return confirmationRedirect(request.url, "error");

    // A PKCE exchange may return a temporary Supabase session. Revoke only
    // that temporary Auth session; it is never written to cookies or used by
    // UniAllege's separate student-session system.
    try { await auth.auth.signOut({ scope: "local" }); } catch { /* The portal session is not affected. */ }
    cookieStore.set(EMAIL_CHANGE_VERIFIER_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/auth/confirm", maxAge: 0 });
    return confirmationRedirect(request.url, "success");
  } catch {
    cookieStore.set(EMAIL_CHANGE_VERIFIER_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/auth/confirm", maxAge: 0 });
    return confirmationRedirect(request.url, "error");
  }
}
