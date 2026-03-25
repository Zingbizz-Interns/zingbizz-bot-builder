-- ─── Sub-accounts ─────────────────────────────────────────────────────────────
-- Users created by an owner to access specific bots

CREATE TABLE IF NOT EXISTS public.sub_accounts (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id     uuid        NOT NULL REFERENCES public.customer_profiles(id) ON DELETE CASCADE,
  user_id      uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  email        text        NOT NULL,
  name         text        NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, email)
);

-- ─── Bot permissions ───────────────────────────────────────────────────────────
-- Which bots a sub-account can access, and whether they can edit

CREATE TABLE IF NOT EXISTS public.bot_permissions (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  sub_account_id uuid        NOT NULL REFERENCES public.sub_accounts(id) ON DELETE CASCADE,
  bot_id         uuid        NOT NULL REFERENCES public.bots(id) ON DELETE CASCADE,
  can_edit       boolean     NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sub_account_id, bot_id)
);

-- Grant access
GRANT ALL ON public.sub_accounts    TO anon, authenticated;
GRANT ALL ON public.bot_permissions TO anon, authenticated;

-- ─── Update handle_new_user trigger ───────────────────────────────────────────
-- Skip creating a customer_profile for sub-accounts (flagged via user_metadata)

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.raw_user_meta_data->>'is_sub_account')::boolean IS TRUE THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.customer_profiles (user_id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
