-- Tasks currently have no due-date column; keep the date optional for existing rows.
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS due_date date;

CREATE INDEX IF NOT EXISTS tasks_open_due_date_idx
  ON public.tasks (user_id, due_date)
  WHERE done = false AND due_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS events_date_time_idx
  ON public.events (user_id, event_date, event_time);

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE
    CHECK (endpoint LIKE 'https://%' AND length(endpoint) <= 2048),
  p256dh text NOT NULL
    CHECK (p256dh ~ '^[A-Za-z0-9_-]+$' AND length(p256dh) <= 256),
  auth_key text NOT NULL
    CHECK (auth_key ~ '^[A-Za-z0-9_-]+$' AND length(auth_key) <= 128),
  time_zone text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS push_subscriptions_owner_access
  ON public.push_subscriptions;
CREATE POLICY push_subscriptions_owner_access
  ON public.push_subscriptions
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.push_subscriptions TO authenticated;
REVOKE ALL ON public.push_subscriptions FROM anon;

CREATE OR REPLACE FUNCTION public.validate_push_subscription_timezone()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_timezone_names
    WHERE name = NEW.time_zone
  ) THEN
    RAISE EXCEPTION 'Invalid IANA time zone'
      USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_push_subscription_timezone
  ON public.push_subscriptions;
CREATE TRIGGER validate_push_subscription_timezone
  BEFORE INSERT OR UPDATE OF time_zone
  ON public.push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_push_subscription_timezone();

CREATE TABLE IF NOT EXISTS public.push_reminder_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL
    REFERENCES public.push_subscriptions (id) ON DELETE CASCADE,
  reminder_kind text NOT NULL
    CHECK (reminder_kind IN ('task_due', 'event_upcoming')),
  record_id uuid NOT NULL,
  scheduled_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sending', 'retry', 'sent')),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  lease_until timestamptz,
  sent_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (subscription_id, reminder_kind, record_id, scheduled_at)
);

ALTER TABLE public.push_reminder_deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.push_reminder_deliveries FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.push_reminder_deliveries TO service_role;

CREATE OR REPLACE FUNCTION public.claim_due_push_reminders(p_limit integer DEFAULT 100)
RETURNS TABLE (
  delivery_id uuid,
  subscription_id uuid,
  reminder_kind text,
  record_id uuid,
  endpoint text,
  p256dh text,
  auth_key text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'service role required' USING ERRCODE = '42501';
  END IF;
  IF p_limit < 1 OR p_limit > 500 THEN
    RAISE EXCEPTION 'invalid batch size' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.push_reminder_deliveries (
    subscription_id,
    reminder_kind,
    record_id,
    scheduled_at
  )
  SELECT ps.id, 'task_due', t.id,
    (t.due_date + time '09:00') AT TIME ZONE ps.time_zone
  FROM public.push_subscriptions AS ps
  JOIN public.tasks AS t ON t.user_id = ps.user_id
  WHERE NOT t.done
    AND t.due_date IS NOT NULL
    AND (t.due_date + time '09:00') AT TIME ZONE ps.time_zone <= now()
    AND (t.due_date + time '09:00') AT TIME ZONE ps.time_zone > now() - interval '5 minutes'

  UNION ALL

  SELECT ps.id, 'event_upcoming', e.id,
    (e.event_date + e.event_time - interval '10 minutes') AT TIME ZONE ps.time_zone
  FROM public.push_subscriptions AS ps
  JOIN public.events AS e ON e.user_id = ps.user_id
  WHERE (e.event_date + e.event_time - interval '10 minutes') AT TIME ZONE ps.time_zone <= now()
    AND (e.event_date + e.event_time - interval '10 minutes') AT TIME ZONE ps.time_zone > now() - interval '5 minutes'

  ON CONFLICT (subscription_id, reminder_kind, record_id, scheduled_at)
  DO NOTHING;

  RETURN QUERY
  WITH claimable AS (
    SELECT d.id, d.subscription_id
    FROM public.push_reminder_deliveries AS d
    JOIN public.push_subscriptions AS ps ON ps.id = d.subscription_id
    WHERE d.attempt_count < 5
      AND (
        d.status IN ('pending', 'retry')
        OR (d.status = 'sending' AND d.lease_until < now())
      )
      AND (
        (
          d.reminder_kind = 'task_due'
          AND EXISTS (
            SELECT 1
            FROM public.tasks AS t
            WHERE t.id = d.record_id
              AND t.user_id = ps.user_id
              AND NOT t.done
              AND t.due_date IS NOT NULL
              AND (t.due_date + time '09:00') AT TIME ZONE ps.time_zone = d.scheduled_at
          )
        )
        OR (
          d.reminder_kind = 'event_upcoming'
          AND EXISTS (
            SELECT 1
            FROM public.events AS e
            WHERE e.id = d.record_id
              AND e.user_id = ps.user_id
              AND (e.event_date + e.event_time - interval '10 minutes')
                AT TIME ZONE ps.time_zone = d.scheduled_at
          )
        )
      )
    ORDER BY d.scheduled_at, d.id
    FOR UPDATE OF d SKIP LOCKED
    LIMIT p_limit
  )
  UPDATE public.push_reminder_deliveries AS d
  SET status = 'sending',
      attempt_count = d.attempt_count + 1,
      lease_until = now() + interval '5 minutes',
      last_error = NULL
  FROM claimable AS c
  JOIN public.push_subscriptions AS ps ON ps.id = c.subscription_id
  WHERE d.id = c.id
  RETURNING d.id, ps.id, d.reminder_kind, d.record_id,
    ps.endpoint, ps.p256dh, ps.auth_key;
END;
$$;

CREATE OR REPLACE FUNCTION public.finish_push_reminder(
  p_delivery_id uuid,
  p_success boolean,
  p_error_code text DEFAULT NULL,
  p_remove_subscription boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_subscription_id uuid;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'service role required' USING ERRCODE = '42501';
  END IF;

  UPDATE public.push_reminder_deliveries
  SET status = CASE WHEN p_success THEN 'sent' ELSE 'retry' END,
      sent_at = CASE WHEN p_success THEN now() ELSE NULL END,
      lease_until = NULL,
      last_error = CASE WHEN p_success THEN NULL ELSE left(p_error_code, 100) END
  WHERE id = p_delivery_id
    AND status = 'sending'
  RETURNING subscription_id INTO v_subscription_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'delivery is not in sending state'
      USING ERRCODE = '22023';
  END IF;

  IF p_remove_subscription THEN
    DELETE FROM public.push_subscriptions WHERE id = v_subscription_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_due_push_reminders(integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_due_push_reminders(integer)
  TO service_role;
REVOKE ALL ON FUNCTION public.finish_push_reminder(uuid, boolean, text, boolean)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finish_push_reminder(uuid, boolean, text, boolean)
  TO service_role;
