# UniAllege

UniAllege is a Next.js school portal demo focused on Secondary Education. University and Tertiary Education remain coming soon.

## Run locally

Requirements: Node.js and npm.

```powershell
npm.cmd install
npm.cmd run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Temporary admin demo access

Open `/admin/login` and use the temporary development credentials shown on that page. This client-side demo login is for local evaluation only; it is not production authentication.

From Admin → Students, create a student and issue their Admission Number and Password. The student can then sign in at `/login`. Student accounts and sessions are stored in that browser's localStorage. They are not shared between browsers or devices and may be cleared by the browser.

## Demo data and persistence

Student account records created by the admin live in browser localStorage for this demo. Passwords are stored in that browser store, so do not use real student information or deploy this as a production school system. The local store is isolated in `app/lib/student-store.ts` and must be replaced with server-side authentication and a persistent database before production use.

Academic results, timetable, announcements, and the fee schedule are preview data and are labeled as such. The app does not record payments or connect a payment gateway.

No environment variables are required for the current demo. See `.env.example` for the empty configuration template. Do not commit `.env.local` or secrets.

## Verify

```powershell
npx.cmd tsc --noEmit
npm.cmd run build
```

## Deploy to Vercel

1. Push this project to a Git provider supported by Vercel.
2. In Vercel, choose **Add New → Project** and import the repository.
3. Keep the detected Next.js framework and default build settings (`npm run build`).
4. Leave Environment Variables empty for this demo; there are no production credentials or database settings to add.
5. Select **Deploy**. After deployment, verify the landing page, `/admin/login`, and `/login` routes.

Vercel can host the UI demo, but browser localStorage is not a shared or durable school database. Create accounts only for local demonstration until server-side authentication and persistence are implemented.
