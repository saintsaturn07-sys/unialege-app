import { normalizeAdmissionNumber } from "../../../lib/student-store";
import { createClient, type AuthError } from "@supabase/supabase-js";
import { timingSafeEqual } from "node:crypto";
import { getSupabaseAdmin } from "../../../lib/supabase-admin";
import {
  assertSameOrigin,
  noStoreHeaders,
  setStudentCookie,
} from "../../../lib/server-session";

type StudentLoginBody = {
  admissionNumber?: unknown;
  password?: unknown;
};

function authEmail(studentId: string) {
  return `student.${studentId}@students.unialege.invalid`;
}

function isWrongCredentials(error: AuthError) {
  return (
    error.code === "invalid_credentials" ||
    (error.status === 400 &&
      /invalid login credentials|invalid credentials/i.test(error.message))
  );
}

export async function POST(request: Request) {
  if (!assertSameOrigin(request)) {
    return Response.json(
      { error: "Invalid request origin." },
      { status: 403, headers: noStoreHeaders() },
    );
  }

  let body: StudentLoginBody;

  try {
    body = (await request.json()) as StudentLoginBody;
  } catch {
    return Response.json(
      { error: "Invalid sign-in request." },
      { status: 400, headers: noStoreHeaders() },
    );
  }

  const admissionNumber =
    typeof body.admissionNumber === "string"
      ? normalizeAdmissionNumber(body.admissionNumber)
      : "";

  const password = typeof body.password === "string" ? body.password : "";

  if (!admissionNumber || !password) {
    return Response.json(
      { error: "Enter your admission number and password." },
      { status: 400, headers: noStoreHeaders() },
    );
  }

  try {
    const db = getSupabaseAdmin();

    const { data: student, error } = await db
      .from("students")
      .select(
        "id, created_at, admission_number, full_name, password, class_name, session, term, field_of_study, trade_subject, auth_user_id, phone, parent_guardian_name, parent_guardian_phone, is_active",
      )
      .eq("admission_number", admissionNumber)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!student) {
      return Response.json(
        {
          error:
            "Invalid admission number or password. Check your credentials or contact the school administrator.",
        },
        { status: 401, headers: noStoreHeaders() },
      );
    }

    if (!student.is_active) {
      return Response.json(
        {
          error:
            "This student account is inactive. Contact the school administrator.",
        },
        { status: 403, headers: noStoreHeaders() },
      );
    }

    let authUserId: string | null = student.auth_user_id ?? null;

    // Legacy student account: verify the old password once, create the
    // secure Supabase Auth account, then clear the legacy password.
    if (!authUserId) {
      const expectedPassword =
        typeof student.password === "string"
          ? Buffer.from(student.password)
          : Buffer.alloc(0);

      const providedPassword = Buffer.from(password);

      if (
        expectedPassword.length === 0 ||
        expectedPassword.length !== providedPassword.length ||
        !timingSafeEqual(expectedPassword, providedPassword)
      ) {
        return Response.json(
          {
            error:
              "Invalid admission number or password. Check your credentials or contact the school administrator.",
          },
          { status: 401, headers: noStoreHeaders() },
        );
      }

      const { data: created, error: createError } =
        await db.auth.admin.createUser({
          email: authEmail(student.id),
          password,
          email_confirm: true,
          user_metadata: {
            student_id: student.id,
          },
        });

      if (createError || !created.user) {
        return Response.json(
          {
            error:
              "This account needs a password reset before secure sign-in can be enabled. Contact the school administrator.",
          },
          { status: 409, headers: noStoreHeaders() },
        );
      }

      authUserId = created.user.id;

      const { error: linkError } = await db
        .from("students")
        .update({
          auth_user_id: authUserId,
          password: null,
        })
        .eq("id", student.id)
        .is("auth_user_id", null);

      if (linkError) {
        await db.auth.admin.deleteUser(authUserId);
        throw linkError;
      }
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    const publicKeys = [
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    ].filter(
      (key, index, keys): key is string =>
        typeof key === "string" &&
        key.trim().length > 0 &&
        keys.indexOf(key) === index,
    );

    if (!supabaseUrl || publicKeys.length === 0) {
      throw new Error("Public Supabase configuration is missing.");
    }

    const { data: linkedAuth, error: linkedAuthError } =
      await db.auth.admin.getUserById(authUserId);

    if (linkedAuthError || !linkedAuth.user?.email) {
      throw new Error(
        "The student's secure sign-in account could not be found.",
      );
    }

    let authSucceeded = false;
    let authAttemptCount = 0;
    let allAttemptsWereCredentialFailures = true;

    for (const key of publicKeys) {
      const authClient = createClient(supabaseUrl, key, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
      });

      const { data: authResult, error: authError } =
        await authClient.auth.signInWithPassword({
          email: linkedAuth.user.email,
          password,
        });

      if (
        !authError &&
        authResult.user &&
        authResult.user.id === authUserId
      ) {
        authSucceeded = true;
        break;
      }

      if (authError) {
        authAttemptCount += 1;
        if (!isWrongCredentials(authError)) {
          allAttemptsWereCredentialFailures = false;
        }
        continue;
      }

      authAttemptCount += 1;
      allAttemptsWereCredentialFailures = false;
    }

    if (!authSucceeded) {
      if (authAttemptCount > 0 && allAttemptsWereCredentialFailures) {
        return Response.json(
          {
            error:
              "Invalid admission number or password. Check your credentials or contact the school administrator.",
          },
          { status: 401, headers: noStoreHeaders() },
        );
      }

      return Response.json(
        {
          error: "Unable to sign in right now. Please try again.",
        },
        { status: 503, headers: noStoreHeaders() },
      );
    }

    await setStudentCookie(authUserId);

    return Response.json(
      {
        student: {
          id: student.id,
          fullName: student.full_name ?? "",
          admissionNumber,
          className: student.class_name ?? "",
          session: student.session ?? "",
          term: student.term ?? "",
          parentGuardianName: student.parent_guardian_name ?? "",
          parentGuardianPhone: student.parent_guardian_phone ?? "",
          fieldOfStudy: student.field_of_study ?? null,
          tradeSubject: student.trade_subject ?? null,
          email: linkedAuth.user.email,
          phone: student.phone ?? "",
        },
      },
      { headers: noStoreHeaders() },
    );
  } catch {
    return Response.json(
      { error: "Unable to sign in right now. Please try again." },
      { status: 503, headers: noStoreHeaders() },
    );
  }
}
