CREATE TABLE IF NOT EXISTS public.memo_drafts (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  content text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.quick_memos (
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  id text NOT NULL CHECK (length(id) > 0),
  content text NOT NULL,
  display_date text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id)
);

CREATE INDEX IF NOT EXISTS quick_memos_user_created_at_idx
  ON public.quick_memos (user_id, created_at DESC);

ALTER TABLE public.memo_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quick_memos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS memo_drafts_owner_access ON public.memo_drafts;
CREATE POLICY memo_drafts_owner_access
  ON public.memo_drafts
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS quick_memos_owner_access ON public.quick_memos;
CREATE POLICY quick_memos_owner_access
  ON public.quick_memos
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

REVOKE ALL ON public.memo_drafts, public.quick_memos FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.memo_drafts, public.quick_memos TO authenticated;

DO $$
DECLARE
  table_name text;
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_publication
    WHERE pubname = 'supabase_realtime'
  ) THEN
    FOREACH table_name IN ARRAY ARRAY['memo_drafts', 'quick_memos']
    LOOP
      IF NOT EXISTS (
        SELECT 1
        FROM pg_catalog.pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = table_name
      ) THEN
        EXECUTE format(
          'ALTER PUBLICATION supabase_realtime ADD TABLE public.%I',
          table_name
        );
      END IF;
    END LOOP;
  END IF;
END;
$$;
