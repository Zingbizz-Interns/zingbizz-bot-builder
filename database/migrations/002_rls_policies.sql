-- ============================================================
-- 002_rls_policies.sql
-- Run AFTER 001_initial_schema.sql
-- ============================================================

-- ─── Enable RLS on all tables ────────────────────────────────
ALTER TABLE customer_profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE bots                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_configs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE triggers                ENABLE ROW LEVEL SECURITY;
ALTER TABLE trigger_keywords        ENABLE ROW LEVEL SECURITY;
ALTER TABLE replier_actions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE replier_buttons         ENABLE ROW LEVEL SECURITY;
ALTER TABLE forms                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_questions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_question_options   ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_conditions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE query_builders          ENABLE ROW LEVEL SECURITY;
ALTER TABLE query_categories        ENABLE ROW LEVEL SECURITY;
ALTER TABLE query_questions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_responses          ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_response_answers   ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events        ENABLE ROW LEVEL SECURITY;

-- ─── Helper function ─────────────────────────────────────────
-- Returns the customer_profiles.id for the currently logged-in user
CREATE OR REPLACE FUNCTION get_my_customer_id()
RETURNS UUID AS $$
  SELECT id FROM customer_profiles WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ─── customer_profiles ───────────────────────────────────────
CREATE POLICY "Users can view own profile"
  ON customer_profiles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON customer_profiles FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON customer_profiles FOR UPDATE
  USING (user_id = auth.uid());

-- ─── bots ────────────────────────────────────────────────────
CREATE POLICY "Users can manage own bots"
  ON bots FOR ALL
  USING (customer_id = get_my_customer_id());

-- ─── platform_configs ────────────────────────────────────────
CREATE POLICY "Users can manage own platform configs"
  ON platform_configs FOR ALL
  USING (bot_id IN (
    SELECT id FROM bots WHERE customer_id = get_my_customer_id()
  ));

-- ─── triggers ────────────────────────────────────────────────
CREATE POLICY "Users can manage own triggers"
  ON triggers FOR ALL
  USING (bot_id IN (
    SELECT id FROM bots WHERE customer_id = get_my_customer_id()
  ));

-- ─── trigger_keywords ────────────────────────────────────────
CREATE POLICY "Users can manage own trigger keywords"
  ON trigger_keywords FOR ALL
  USING (trigger_id IN (
    SELECT t.id FROM triggers t
    JOIN bots b ON t.bot_id = b.id
    WHERE b.customer_id = get_my_customer_id()
  ));

-- ─── replier_actions ─────────────────────────────────────────
CREATE POLICY "Users can manage own replier actions"
  ON replier_actions FOR ALL
  USING (trigger_id IN (
    SELECT t.id FROM triggers t
    JOIN bots b ON t.bot_id = b.id
    WHERE b.customer_id = get_my_customer_id()
  ));

-- ─── replier_buttons ─────────────────────────────────────────
CREATE POLICY "Users can manage own replier buttons"
  ON replier_buttons FOR ALL
  USING (replier_id IN (
    SELECT ra.id FROM replier_actions ra
    JOIN triggers t ON ra.trigger_id = t.id
    JOIN bots b ON t.bot_id = b.id
    WHERE b.customer_id = get_my_customer_id()
  ));

-- ─── forms ───────────────────────────────────────────────────
CREATE POLICY "Users can manage own forms"
  ON forms FOR ALL
  USING (trigger_id IN (
    SELECT t.id FROM triggers t
    JOIN bots b ON t.bot_id = b.id
    WHERE b.customer_id = get_my_customer_id()
  ));

-- ─── form_questions ──────────────────────────────────────────
CREATE POLICY "Users can manage own form questions"
  ON form_questions FOR ALL
  USING (form_id IN (
    SELECT f.id FROM forms f
    JOIN triggers t ON f.trigger_id = t.id
    JOIN bots b ON t.bot_id = b.id
    WHERE b.customer_id = get_my_customer_id()
  ));

-- ─── form_question_options ───────────────────────────────────
CREATE POLICY "Users can manage own question options"
  ON form_question_options FOR ALL
  USING (question_id IN (
    SELECT fq.id FROM form_questions fq
    JOIN forms f ON fq.form_id = f.id
    JOIN triggers t ON f.trigger_id = t.id
    JOIN bots b ON t.bot_id = b.id
    WHERE b.customer_id = get_my_customer_id()
  ));

-- ─── form_conditions ─────────────────────────────────────────
CREATE POLICY "Users can manage own form conditions"
  ON form_conditions FOR ALL
  USING (question_id IN (
    SELECT fq.id FROM form_questions fq
    JOIN forms f ON fq.form_id = f.id
    JOIN triggers t ON f.trigger_id = t.id
    JOIN bots b ON t.bot_id = b.id
    WHERE b.customer_id = get_my_customer_id()
  ));

-- ─── query_builders ──────────────────────────────────────────
CREATE POLICY "Users can manage own query builders"
  ON query_builders FOR ALL
  USING (trigger_id IN (
    SELECT t.id FROM triggers t
    JOIN bots b ON t.bot_id = b.id
    WHERE b.customer_id = get_my_customer_id()
  ));

-- ─── query_categories ────────────────────────────────────────
CREATE POLICY "Users can manage own query categories"
  ON query_categories FOR ALL
  USING (query_builder_id IN (
    SELECT qb.id FROM query_builders qb
    JOIN triggers t ON qb.trigger_id = t.id
    JOIN bots b ON t.bot_id = b.id
    WHERE b.customer_id = get_my_customer_id()
  ));

-- ─── query_questions ─────────────────────────────────────────
CREATE POLICY "Users can manage own query questions"
  ON query_questions FOR ALL
  USING (category_id IN (
    SELECT qc.id FROM query_categories qc
    JOIN query_builders qb ON qc.query_builder_id = qb.id
    JOIN triggers t ON qb.trigger_id = t.id
    JOIN bots b ON t.bot_id = b.id
    WHERE b.customer_id = get_my_customer_id()
  ));

-- ─── form_responses ──────────────────────────────────────────
CREATE POLICY "Users can view own form responses"
  ON form_responses FOR SELECT
  USING (form_id IN (
    SELECT f.id FROM forms f
    JOIN triggers t ON f.trigger_id = t.id
    JOIN bots b ON t.bot_id = b.id
    WHERE b.customer_id = get_my_customer_id()
  ));

-- Backend (service_role) handles inserts — no INSERT policy needed for anon/user

-- ─── form_response_answers ───────────────────────────────────
CREATE POLICY "Users can view own response answers"
  ON form_response_answers FOR SELECT
  USING (response_id IN (
    SELECT fr.id FROM form_responses fr
    JOIN forms f ON fr.form_id = f.id
    JOIN triggers t ON f.trigger_id = t.id
    JOIN bots b ON t.bot_id = b.id
    WHERE b.customer_id = get_my_customer_id()
  ));

-- ─── analytics_events ────────────────────────────────────────
CREATE POLICY "Users can view own analytics"
  ON analytics_events FOR SELECT
  USING (bot_id IN (
    SELECT id FROM bots WHERE customer_id = get_my_customer_id()
  ));

-- Backend (service_role) handles all inserts into analytics_events, form_responses, form_response_answers
