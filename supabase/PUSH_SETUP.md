# Push reminder deployment

Push reminders use the signed-in user's `public.push_subscriptions` row and the
existing `public.tasks` and `public.events` tables. Apply
`migrations/20261116000000_push_reminders.sql` in the Supabase SQL Editor before
deploying the app update. It adds the optional task `due_date`, owner-only
subscription RLS, and a private, idempotent delivery queue. It does not create
or change the existing task/event tables or execute on your project automatically.

The existing schema is expected to have UUID `id` and `user_id` columns,
`tasks.done`, and `events.event_date` / `events.event_time`; events are removed
from reminders when deleted. Incomplete tasks with a due date are reminded at
9:00 AM, and events 10 minutes before start, in the time zone saved by each
device when it enables push.

## Deploy the sender

1. Link the Supabase CLI to the existing project and deploy the function:

   ```sh
   supabase login
   supabase link --project-ref YOUR_PROJECT_REF
   supabase functions deploy send-push-reminders --no-verify-jwt
   ```

   `verify_jwt` is disabled only because the scheduled request uses a dedicated
   random bearer secret; the function checks that secret before accessing data.
   The request also supplies the project's publishable API key for the gateway.
   The Supabase Edge Function runtime supplies `SUPABASE_URL` and
   `SUPABASE_SERVICE_ROLE_KEY`; neither key belongs in the browser.

2. Generate VAPID keys:

   ```sh
   npx --yes web-push generate-vapid-keys
   ```

   Keep the private key only in Edge Function secrets. Set the public key for
   the server and the browser as shown below. In PowerShell, generate the
   scheduler secret with:

   ```powershell
   $secret = node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
   ```

   Set the Edge Function secrets (replace the VAPID placeholders with the
   generated values and use a real contact address):

   ```powershell
   supabase secrets set VAPID_PUBLIC_KEY="YOUR_VAPID_PUBLIC_KEY" VAPID_PRIVATE_KEY="YOUR_VAPID_PRIVATE_KEY" VAPID_SUBJECT="mailto:you@example.com" PUSH_CRON_SECRET="$secret"
   ```

3. In the Supabase SQL Editor, enable the scheduler/network extensions, save
   the same random secret, function URL, and project's publishable API key in
   Vault, and schedule the sender once per minute. Replace all placeholders;
   do not commit the secret.

   ```sql
   CREATE EXTENSION IF NOT EXISTS pg_cron;
   CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

   SELECT vault.create_secret('THE_SAME_PUSH_CRON_SECRET', 'my_desk_push_cron_secret');
   SELECT vault.create_secret('YOUR_SUPABASE_PUBLISHABLE_KEY', 'my_desk_push_apikey');
   SELECT vault.create_secret(
     'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-push-reminders',
     'my_desk_push_function_url'
   );

   DO $$
   DECLARE
     existing_job_id bigint;
   BEGIN
     SELECT jobid INTO existing_job_id
     FROM cron.job
     WHERE jobname = 'my-desk-push-reminders'
     LIMIT 1;
     IF existing_job_id IS NOT NULL THEN
       PERFORM cron.unschedule(existing_job_id);
     END IF;

     PERFORM cron.schedule(
       'my-desk-push-reminders',
       '* * * * *',
       $job$
         SELECT net.http_post(
           url := (
             SELECT decrypted_secret
             FROM vault.decrypted_secrets
             WHERE name = 'my_desk_push_function_url'
           ),
           headers := jsonb_build_object(
             'Content-Type', 'application/json',
             'apikey', (
               SELECT decrypted_secret
               FROM vault.decrypted_secrets
               WHERE name = 'my_desk_push_apikey'
             ),
             'Authorization', 'Bearer ' || (
               SELECT decrypted_secret
               FROM vault.decrypted_secrets
               WHERE name = 'my_desk_push_cron_secret'
             )
           ),
           body := '{}'::jsonb
         );
       $job$
     );
   END;
   $$;
   ```

   `pg_net` briefly queues request headers while dispatching them, so keep
   database login access limited to trusted operators.

4. Add the generated **public** VAPID key to the app's `.env.local` and
   deployment build environment:

   ```dotenv
   VITE_WEB_PUSH_PUBLIC_KEY=YOUR_VAPID_PUBLIC_KEY
   ```

   Rebuild and deploy the app over HTTPS. This key is public; never put the
   private key or service role key in a `VITE_` variable.

5. In MY DESK, choose the bell icon and explicitly enable push. The browser
   permission prompt appears only after that click. On iPhone/iPad, users must
   install the site to the Home Screen and launch the installed app on
   iOS/iPadOS 16.4 or later. Unsupported browsers and ordinary iOS browser tabs
   cannot receive Web Push. Localhost is suitable for development; other
   origins must use HTTPS.

The push payload contains only a reminder type; the service worker supplies
fixed generic text and does not receive task titles, event titles, or notes.
Only known Google, Mozilla, and Apple push service hosts are contacted.
Expired push endpoints (404/410) are removed. A failed send is retried up to
five times, and the unique delivery key plus a database lease prevents
concurrent duplicate sends. To remove the scheduler, run
`SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'my-desk-push-reminders';`
and remove the three Vault secrets and Edge Function secrets in Supabase.
