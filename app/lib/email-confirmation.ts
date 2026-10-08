import "server-only";

import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

type CookieStore = Awaited<ReturnType<typeof cookies>>;

export const EMAIL_CHANGE_VERIFIER_COOKIE = "unialege_email_change_pkce";
const EMAIL_CHANGE_VERIFIER_MAX_AGE = 10 * 60;
const PRODUCTION_APP_URL = "https://unialege-app.vercel.app";

export function getPublicAppOrigin(requestUrl: string) {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL;
  if (configuredUrl) {
    try { return new URL(configuredUrl).origin; } catch { /* Use the safe environment fallback. */ }
  }
  if (process.env.NODE_ENV !== "production") {
    try { return new URL(requestUrl).origin; } catch { /* Use the production origin if the request URL is invalid. */ }
  }
  return PRODUCTION_APP_URL;
}

export function createEmailConfirmationClient(cookieStore: CookieStore) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publicKey) throw new Error("Supabase public Auth configuration is missing.");

  // Keep the one-time PKCE verifier in an HttpOnly cookie so the email link
  // can be completed in this browser. Supabase session values remain only in
  // this request's memory and never become a portal session or browser token.
  const memory = new Map<string, string>();
  const storage = {
    async getItem(key: string) {
      if (key.endsWith("-code-verifier")) return cookieStore.get(EMAIL_CHANGE_VERIFIER_COOKIE)?.value ?? null;
      return memory.get(key) ?? null;
    },
    async setItem(key: string, value: string) {
      if (key.endsWith("-code-verifier")) {
        cookieStore.set(EMAIL_CHANGE_VERIFIER_COOKIE, value, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/auth/confirm",
          maxAge: EMAIL_CHANGE_VERIFIER_MAX_AGE,
        });
        return;
      }
      memory.set(key, value);
    },
    async removeItem(key: string) {
      if (key.endsWith("-code-verifier")) {
        cookieStore.set(EMAIL_CHANGE_VERIFIER_COOKIE, "", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/auth/confirm",
          maxAge: 0,
        });
        return;
      }
      memory.delete(key);
    },
  };

  return createClient(url, publicKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      flowType: "pkce",
      persistSession: true,
      storage,
    },
  });
}
