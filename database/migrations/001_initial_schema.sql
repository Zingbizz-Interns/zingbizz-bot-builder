-- ============================================================
-- 001_initial_schema.sql
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── customer_profiles ───────────────────────────────────────
-- Linked to Supabase Auth users (auth.users)
CREATE TABLE customer_profiles (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── bots ────────────────────────────────────────────────────
CREATE TABLE bots (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id      UUID REFERENCES customer_profiles(id) ON DELETE CASCADE NOT NULL,
  name             TEXT NOT NULL,
  fallback_message TEXT NOT NULL DEFAULT 'Sorry, I didn''t understand that. Please try again.',
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─── platform_configs ────────────────────────────────────────
-- One row per platform (whatsapp / instagram) per bot
CREATE TABLE platform_configs (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bot_id            UUID REFERENCES bots(id) ON DELETE CASCADE NOT NULL,
  platform          TEXT NOT NULL CHECK (platform IN ('whatsapp', 'instagram')),

  -- WhatsApp specific
  phone_number_id   TEXT,
  waba_id           TEXT,

  -- Instagram specific
  page_id           TEXT,

  -- Shared credentials
  access_token      TEXT NOT NULL,
  verify_token      TEXT NOT NULL,

  -- Session config
  session_expiry_ms  INTEGER NOT NULL DEFAULT 600000,   -- 10 minutes
  warning_time_ms    INTEGER NOT NULL DEFAULT 120000,   -- 2 minutes before expiry
  warning_message    TEXT NOT NULL DEFAULT 'Your session will expire in 2 minutes. Please respond to continue.',

  is_active         BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(bot_id, platform)
);

-- ─── triggers ────────────────────────────────────────────────
CREATE TABLE triggers (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bot_id       UUID REFERENCES bots(id) ON DELETE CASCADE NOT NULL,
  name         TEXT NOT NULL,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('single', 'multi', 'any')),
  platforms    TEXT[] NOT NULL DEFAULT ARRAY['whatsapp', 'instagram'],
  action_type  TEXT NOT NULL CHECK (action_type IN ('replier', 'form', 'query')),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── trigger_keywords ────────────────────────────────────────
-- One row per keyword for single/multi triggers
CREATE TABLE trigger_keywords (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trigger_id UUID REFERENCES triggers(id) ON DELETE CASCADE NOT NULL,
  keyword    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── replier_actions ─────────────────────────────────────────
CREATE TABLE replier_actions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trigger_id   UUID REFERENCES triggers(id) ON DELETE CASCADE NOT NULL UNIQUE,
  message_text TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── replier_buttons ─────────────────────────────────────────
CREATE TABLE replier_buttons (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  replier_id          UUID REFERENCES replier_actions(id) ON DELETE CASCADE NOT NULL,
  button_label        TEXT NOT NULL,
  links_to_trigger_id UUID REFERENCES triggers(id) ON DELETE SET NULL,
  order_index         INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─── forms ───────────────────────────────────────────────────
CREATE TABLE forms (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trigger_id     UUID REFERENCES triggers(id) ON DELETE CASCADE NOT NULL UNIQUE,
  title          TEXT NOT NULL,
  submit_message TEXT NOT NULL DEFAULT 'Thank you! Your responses have been submitted.',
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ─── form_questions ──────────────────────────────────────────
CREATE TABLE form_questions (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  form_id              UUID REFERENCES forms(id) ON DELETE CASCADE NOT NULL,
  order_index          INTEGER NOT NULL DEFAULT 0,
  question_text        TEXT NOT NULL,
  input_type           TEXT NOT NULL CHECK (input_type IN ('text', 'choice')),
  validation_type      TEXT NOT NULL DEFAULT 'none' CHECK (validation_type IN ('none', 'email', 'phone', 'date', 'name', 'number')),
  is_required          BOOLEAN NOT NULL DEFAULT TRUE,
  reference_question_id UUID REFERENCES form_questions(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ─── form_question_options ───────────────────────────────────
-- Options for multiple choice questions
CREATE TABLE form_question_options (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_id UUID REFERENCES form_questions(id) ON DELETE CASCADE NOT NULL,
  option_label TEXT NOT NULL,
  order_index  INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── form_conditions ─────────────────────────────────────────
-- "Show this question only if [condition_question] [operator] [value]"
CREATE TABLE form_conditions (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_id          UUID REFERENCES form_questions(id) ON DELETE CASCADE NOT NULL,
  condition_question_id UUID REFERENCES form_questions(id) ON DELETE CASCADE NOT NULL,
  condition_operator   TEXT NOT NULL CHECK (condition_operator IN ('eq', 'neq', 'contains')),
  condition_value      TEXT NOT NULL,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ─── query_builders ──────────────────────────────────────────
CREATE TABLE query_builders (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trigger_id UUID REFERENCES triggers(id) ON DELETE CASCADE NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── query_categories ────────────────────────────────────────
CREATE TABLE query_categories (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  query_builder_id UUID REFERENCES query_builders(id) ON DELETE CASCADE NOT NULL,
  category_name    TEXT NOT NULL,
  order_index      INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─── query_questions ─────────────────────────────────────────
CREATE TABLE query_questions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id   UUID REFERENCES query_categories(id) ON DELETE CASCADE NOT NULL,
  question_text TEXT NOT NULL,
  answer_text   TEXT NOT NULL,
  order_index   INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── form_responses ──────────────────────────────────────────
CREATE TABLE form_responses (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  form_id      UUID REFERENCES forms(id) ON DELETE CASCADE NOT NULL,
  sender_id    TEXT NOT NULL,
  platform     TEXT NOT NULL CHECK (platform IN ('whatsapp', 'instagram')),
  started_at   TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  is_complete  BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── form_response_answers ───────────────────────────────────
CREATE TABLE form_response_answers (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  response_id UUID REFERENCES form_responses(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES form_questions(id) ON DELETE CASCADE NOT NULL,
  answer_text TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── analytics_events ────────────────────────────────────────
CREATE TABLE analytics_events (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bot_id      UUID REFERENCES bots(id) ON DELETE CASCADE NOT NULL,
  event_type  TEXT NOT NULL CHECK (event_type IN (
    'trigger_fired',
    'form_started',
    'form_completed',
    'form_abandoned',
    'question_answered',
    'question_abandoned',
    'query_opened'
  )),
  trigger_id  UUID REFERENCES triggers(id) ON DELETE SET NULL,
  question_id UUID REFERENCES form_questions(id) ON DELETE SET NULL,
  platform    TEXT CHECK (platform IN ('whatsapp', 'instagram')),
  sender_id   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Indexes ─────────────────────────────────────────────────
CREATE INDEX idx_bots_customer_id                    ON bots(customer_id);
CREATE INDEX idx_platform_configs_bot_id             ON platform_configs(bot_id);
CREATE INDEX idx_platform_configs_phone_number_id    ON platform_configs(phone_number_id);
CREATE INDEX idx_platform_configs_page_id            ON platform_configs(page_id);
CREATE INDEX idx_triggers_bot_id                     ON triggers(bot_id);
CREATE INDEX idx_trigger_keywords_trigger_id         ON trigger_keywords(trigger_id);
CREATE INDEX idx_trigger_keywords_keyword            ON trigger_keywords(keyword);
CREATE INDEX idx_replier_buttons_replier_id          ON replier_buttons(replier_id);
CREATE INDEX idx_form_questions_form_id              ON form_questions(form_id);
CREATE INDEX idx_form_question_options_question_id   ON form_question_options(question_id);
CREATE INDEX idx_form_conditions_question_id         ON form_conditions(question_id);
CREATE INDEX idx_query_categories_query_builder_id   ON query_categories(query_builder_id);
CREATE INDEX idx_query_questions_category_id         ON query_questions(category_id);
CREATE INDEX idx_form_responses_form_id              ON form_responses(form_id);
CREATE INDEX idx_form_responses_sender_id            ON form_responses(sender_id);
CREATE INDEX idx_form_response_answers_response_id   ON form_response_answers(response_id);
CREATE INDEX idx_analytics_events_bot_id             ON analytics_events(bot_id);
CREATE INDEX idx_analytics_events_created_at         ON analytics_events(created_at);
