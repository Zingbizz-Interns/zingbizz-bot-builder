-- ─── Contacts ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.contacts (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id          uuid        NOT NULL REFERENCES public.bots(id) ON DELETE CASCADE,
  sender_id       text        NOT NULL,
  platform        text        NOT NULL,
  first_seen_at   timestamptz NOT NULL DEFAULT now(),
  last_seen_at    timestamptz NOT NULL DEFAULT now(),
  message_count   integer     NOT NULL DEFAULT 1,
  UNIQUE (bot_id, sender_id, platform)
);

CREATE INDEX IF NOT EXISTS idx_contacts_bot_id ON public.contacts(bot_id);
CREATE INDEX IF NOT EXISTS idx_contacts_last_seen ON public.contacts(bot_id, last_seen_at DESC);

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contacts_owner" ON public.contacts
  USING (
    bot_id IN (
      SELECT b.id FROM public.bots b
      JOIN public.customer_profiles cp ON cp.id = b.customer_id
      WHERE cp.user_id = auth.uid()
    )
  );

-- ─── Business Hours ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.business_hours (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id                  uuid        NOT NULL UNIQUE REFERENCES public.bots(id) ON DELETE CASCADE,
  timezone                text        NOT NULL DEFAULT 'UTC',
  mon_start               time,
  mon_end                 time,
  tue_start               time,
  tue_end                 time,
  wed_start               time,
  wed_end                 time,
  thu_start               time,
  thu_end                 time,
  fri_start               time,
  fri_end                 time,
  sat_start               time,
  sat_end                 time,
  sun_start               time,
  sun_end                 time,
  outside_hours_message   text        NOT NULL DEFAULT 'Sorry, we are currently outside business hours.',
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "business_hours_owner" ON public.business_hours
  USING (
    bot_id IN (
      SELECT b.id FROM public.bots b
      JOIN public.customer_profiles cp ON cp.id = b.customer_id
      WHERE cp.user_id = auth.uid()
    )
  );

-- Grant access
GRANT ALL ON public.contacts TO anon, authenticated, service_role;
GRANT ALL ON public.business_hours TO anon, authenticated, service_role;
