# STATIC

STATIC is a React app built with Vite and Supabase. The GitHub Pages site is
public at <https://suyeon02.github.io/static/>; user data is protected by
Supabase Auth and row-level security (RLS), not by hiding the website.

## GitHub Pages deployment

The `Deploy to GitHub Pages` workflow builds and deploys `main` on each push.
It requires these repository Actions variables under **Settings → Secrets and
variables → Actions → Variables**:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_WEB_PUSH_PUBLIC_KEY`

These are browser-visible build settings. Never put a Supabase service role
key, `PUSH_CRON_SECRET`, or `VAPID_PRIVATE_KEY` in a `VITE_` variable or in
this repository. Keep server-side secrets in Supabase Edge Function secrets.

For local development, create an untracked `.env.local` with the same three
`VITE_` variables, then run `npm install` and `npm run dev`. The production
build uses the `/static/` base path required by the project Pages URL.

In the Supabase Dashboard, add
`https://suyeon02.github.io/static/**` to **Authentication → URL
Configuration → Redirect URLs**. Do not remove any existing redirect URLs.

Push delivery also requires the Supabase database/function setup described in
[`supabase/PUSH_SETUP.md`](supabase/PUSH_SETUP.md), an HTTPS browser, and the
user to enable notifications in the app.

## Quick memo synchronization

Before deploying an app update that synchronizes the dashboard memo draft and
quick-memo list across devices, apply
[`supabase/migrations/20261116010000_sync_quick_memos.sql`](supabase/migrations/20261116010000_sync_quick_memos.sql)
in the Supabase Dashboard's **SQL Editor**. This creates owner-only tables with
RLS and enables Realtime for those tables when the `supabase_realtime`
publication is present. The first login on each device merges legacy
`static_memo` and `static_quick_memos` data without replacing existing cloud
drafts or memos. If a device has a different unsaved draft from an existing
cloud draft, the local draft is preserved as a quick memo. Since the legacy
localStorage keys were device-wide, they are imported only for the first
account signed in on each device; other accounts load only their own cloud
records. Deploy the app only after the migration succeeds.
