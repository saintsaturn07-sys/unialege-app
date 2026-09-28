# UniAllege

UniAllege is a Next.js school portal for secondary education.

## Run locally

Requirements: Node.js and npm.

```powershell
npm.cmd install
npm.cmd run dev
```

Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and the server-only `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`. Never prefix the service-role key with `NEXT_PUBLIC_`, expose it in browser code, or commit `.env.local`.

## Authentication and data

Student login continues to use Admission Number + Password. On the first successful login, the server verifies the existing database password, creates a linked Supabase Auth identity, and clears the legacy password field. If Supabase Auth rejects an existing password (for example, it is below the configured password minimum), an administrator must set a new password in Student Management before that student can finish migration.

In development, admin sign-in retains the temporary demo credentials (`admin@unialege.edu` / `AdminDemo!2026`). Production requires server-only `UNIALEGE_ADMIN_USERNAME` and `UNIALEGE_ADMIN_PASSWORD` values. A successful sign-in issues a signed HttpOnly server cookie used by protected routes.

Student records, results, CBT management, attempts and marking use protected server routes. The browser receives only safe student display data and question options; correct answers remain in the protected database and server-side attempt snapshot.

Apply migration `202609280003_secure_student_cbt_access.sql` first to add the Auth link and attempt schema. Deploy the matching server routes, verify login and admin flows, then apply `202609280004_lock_down_public_student_and_cbt_access.sql`. The cutover migration removes direct table access from `anon` and `authenticated`; applying it before the replacement routes are deployed will interrupt app data access.

## Verify

```powershell
npx.cmd tsc --noEmit
npm.cmd run build
```
