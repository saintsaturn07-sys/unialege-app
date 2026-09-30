import { createClient } from "@supabase/supabase-js";
import { assertSameOrigin, noStoreHeaders, requireStudent } from "../../../lib/server-session";
import { getSupabaseAdmin } from "../../../lib/supabase-admin";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function PATCH(request: Request) {
  const student = await requireStudent();
  if (!student) return Response.json({ error: "Student sign-in required." }, { status: 401, headers: noStoreHeaders() });
  if (!assertSameOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403, headers: noStoreHeaders() });
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; } catch { return Response.json({ error: "Invalid account update." }, { status: 400, headers: noStoreHeaders() }); }

  const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
  if (!currentPassword) return Response.json({ error: "Enter your current password to confirm this account change." }, { status: 400, headers: noStoreHeaders() });
  if (Object.keys(body).some((key) => !["currentPassword", "email", "newPassword"].includes(key))) return Response.json({ error: "Only account email and password can be changed here." }, { status: 400, headers: noStoreHeaders() });
  const changesEmail = Object.hasOwn(body, "email");
  const changesPassword = Object.hasOwn(body, "newPassword");
  if (!changesEmail && !changesPassword) return Response.json({ error: "Enter a new email address or password." }, { status: 400, headers: noStoreHeaders() });
  if (changesEmail && (!email || email.length > 254 || !emailPattern.test(email))) return Response.json({ error: "Enter a valid email address." }, { status: 400, headers: noStoreHeaders() });
  if (changesPassword && (newPassword.length < 8 || newPassword.length > 128)) return Response.json({ error: "Choose a password between 8 and 128 characters." }, { status: 400, headers: noStoreHeaders() });

  try {
    const db = getSupabaseAdmin();
    const { data: authData, error: lookupError } = await db.auth.admin.getUserById(student.auth_user_id);
    if (lookupError || !authData.user?.email) throw new Error("Unable to verify your account. Sign in again and retry.");
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!supabaseUrl || !publicKey) throw new Error("Supabase sign-in configuration is missing on the server.");
    const auth = createClient(supabaseUrl, publicKey, { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } });
    const { data: signedIn, error: signInError } = await auth.auth.signInWithPassword({ email: authData.user.email, password: currentPassword });
    if (signInError || signedIn.user?.id !== student.auth_user_id) return Response.json({ error: "Your current password is incorrect." }, { status: 401, headers: noStoreHeaders() });

    const updates: { email?: string; password?: string } = {};
    if (changesEmail && email !== authData.user.email) updates.email = email;
    if (changesPassword) updates.password = newPassword;
    if (!Object.keys(updates).length) return Response.json({ error: "Enter a different email address or a new password." }, { status: 400, headers: noStoreHeaders() });
    const { data: updatedAuth, error: updateError } = await auth.auth.updateUser(updates);
    if (updateError) {
      if (/already|registered|exists/i.test(updateError.message)) return Response.json({ error: "That email address is already in use." }, { status: 409, headers: noStoreHeaders() });
      return Response.json({ error: "Supabase could not update your account. Check the details and try again." }, { status: 400, headers: noStoreHeaders() });
    }
    const confirmationRequired = Boolean(updates.email && updatedAuth.user?.email !== email);
    return Response.json({
      email: updatedAuth.user?.email ?? authData.user.email,
      email_confirmation_required: confirmationRequired,
      message: confirmationRequired && updates.password
        ? "Password updated. Check your email to confirm the new email address."
        : confirmationRequired ? "Check your email to confirm the new address. Your current email remains active until confirmation."
        : updates.email && updates.password ? "Email and password updated successfully."
        : updates.email ? "Email updated successfully."
        : "Password updated successfully.",
    }, { headers: noStoreHeaders() });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to update your account." }, { status: 500, headers: noStoreHeaders() });
  }
}
