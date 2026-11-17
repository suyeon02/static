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
#variable_conflict use_column
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

REVOKE ALL ON FUNCTION public.claim_due_push_reminders(integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_due_push_reminders(integer)
  TO service_role;
