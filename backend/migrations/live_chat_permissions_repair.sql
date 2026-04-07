-- ============================================================
-- Live Chat permissions repair
-- Run this once in Supabase SQL Editor on an existing project
-- if conversations/messages/alerts tables already exist but the app sees
-- "permission denied for table ..." errors.
-- ============================================================

grant usage on schema public to anon, authenticated, service_role;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'conversations'
  ) THEN
    EXECUTE 'grant all on public.conversations to anon, authenticated, service_role';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'messages'
  ) THEN
    EXECUTE 'grant all on public.messages to anon, authenticated, service_role';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'alert_settings'
  ) THEN
    EXECUTE 'grant all on public.alert_settings to anon, authenticated, service_role';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'alerts'
  ) THEN
    EXECUTE 'grant all on public.alerts to anon, authenticated, service_role';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'canned_responses'
  ) THEN
    EXECUTE 'grant all on public.canned_responses to anon, authenticated, service_role';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'conversation_notes'
  ) THEN
    EXECUTE 'grant all on public.conversation_notes to anon, authenticated, service_role';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.routines
    WHERE routine_schema = 'public'
      AND routine_name = 'increment_conversation_fallback_count'
  ) THEN
    EXECUTE 'grant execute on function public.increment_conversation_fallback_count(uuid) to anon, authenticated, service_role';
  END IF;
END $$;
