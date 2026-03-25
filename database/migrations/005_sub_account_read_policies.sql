-- ─── Sub-account read access ──────────────────────────────────────────────────
-- Adds FOR SELECT policies so sub-accounts can read data for bots they have
-- been granted access to via bot_permissions.
--
-- The existing FOR ALL owner policies remain untouched — they continue to
-- govern all writes. RLS OR's multiple policies of the same command, so
-- sub-accounts gain reads but writes still require ownership.

-- Helper: all bot IDs the current user can access (owned + permitted)
CREATE OR REPLACE FUNCTION get_my_accessible_bot_ids()
RETURNS SETOF UUID AS $$
  SELECT id FROM bots WHERE customer_id = get_my_customer_id()
    UNION
      SELECT bp.bot_id FROM bot_permissions bp
        JOIN sub_accounts sa ON bp.sub_account_id = sa.id
          WHERE sa.user_id = auth.uid()
          $$ LANGUAGE SQL SECURITY DEFINER STABLE;

          -- ─── bots ─────────────────────────────────────────────────────────────────────
          CREATE POLICY "Sub-accounts can view permitted bots"
            ON bots FOR SELECT
              USING (
                  id IN (
                        SELECT bp.bot_id FROM bot_permissions bp
                              JOIN sub_accounts sa ON bp.sub_account_id = sa.id
                                    WHERE sa.user_id = auth.uid()
                                        )
                                          );

                                          -- ─── platform_configs ─────────────────────────────────────────────────────────
                                          CREATE POLICY "Sub-accounts can view permitted platform configs"
                                            ON platform_configs FOR SELECT
                                              USING (bot_id IN (SELECT get_my_accessible_bot_ids()));

                                              -- ─── triggers ─────────────────────────────────────────────────────────────────
                                              CREATE POLICY "Sub-accounts can view permitted triggers"
                                                ON triggers FOR SELECT
                                                  USING (bot_id IN (SELECT get_my_accessible_bot_ids()));

                                                  -- ─── trigger_keywords ─────────────────────────────────────────────────────────
                                                  CREATE POLICY "Sub-accounts can view permitted trigger keywords"
                                                    ON trigger_keywords FOR SELECT
                                                      USING (trigger_id IN (
                                                          SELECT t.id FROM triggers t
                                                              WHERE t.bot_id IN (SELECT get_my_accessible_bot_ids())
                                                                ));

                                                                -- ─── replier_actions ──────────────────────────────────────────────────────────
                                                                CREATE POLICY "Sub-accounts can view permitted replier actions"
                                                                  ON replier_actions FOR SELECT
                                                                    USING (trigger_id IN (
                                                                        SELECT t.id FROM triggers t
                                                                            WHERE t.bot_id IN (SELECT get_my_accessible_bot_ids())
                                                                              ));

                                                                              -- ─── replier_buttons ──────────────────────────────────────────────────────────
                                                                              CREATE POLICY "Sub-accounts can view permitted replier buttons"
                                                                                ON replier_buttons FOR SELECT
                                                                                  USING (replier_id IN (
                                                                                      SELECT ra.id FROM replier_actions ra
                                                                                          JOIN triggers t ON ra.trigger_id = t.id
                                                                                              WHERE t.bot_id IN (SELECT get_my_accessible_bot_ids())
                                                                                                ));

                                                                                                -- ─── forms ────────────────────────────────────────────────────────────────────
                                                                                                CREATE POLICY "Sub-accounts can view permitted forms"
                                                                                                  ON forms FOR SELECT
                                                                                                    USING (trigger_id IN (
                                                                                                        SELECT t.id FROM triggers t
                                                                                                            WHERE t.bot_id IN (SELECT get_my_accessible_bot_ids())
                                                                                                              ));

                                                                                                              -- ─── form_questions ───────────────────────────────────────────────────────────
                                                                                                              CREATE POLICY "Sub-accounts can view permitted form questions"
                                                                                                                ON form_questions FOR SELECT
                                                                                                                  USING (form_id IN (
                                                                                                                      SELECT f.id FROM forms f
                                                                                                                          JOIN triggers t ON f.trigger_id = t.id
                                                                                                                              WHERE t.bot_id IN (SELECT get_my_accessible_bot_ids())
                                                                                                                                ));

                                                                                                                                -- ─── form_question_options ────────────────────────────────────────────────────
                                                                                                                                CREATE POLICY "Sub-accounts can view permitted question options"
                                                                                                                                  ON form_question_options FOR SELECT
                                                                                                                                    USING (question_id IN (
                                                                                                                                        SELECT fq.id FROM form_questions fq
                                                                                                                                            JOIN forms f ON fq.form_id = f.id
                                                                                                                                                JOIN triggers t ON f.trigger_id = t.id
                                                                                                                                                    WHERE t.bot_id IN (SELECT get_my_accessible_bot_ids())
                                                                                                                                                      ));

                                                                                                                                                      -- ─── form_conditions ──────────────────────────────────────────────────────────
                                                                                                                                                      CREATE POLICY "Sub-accounts can view permitted form conditions"
                                                                                                                                                        ON form_conditions FOR SELECT
                                                                                                                                                          USING (question_id IN (
                                                                                                                                                              SELECT fq.id FROM form_questions fq
                                                                                                                                                                  JOIN forms f ON fq.form_id = f.id
                                                                                                                                                                      JOIN triggers t ON f.trigger_id = t.id
                                                                                                                                                                          WHERE t.bot_id IN (SELECT get_my_accessible_bot_ids())
                                                                                                                                                                            ));

                                                                                                                                                                            -- ─── query_builders ───────────────────────────────────────────────────────────
                                                                                                                                                                            CREATE POLICY "Sub-accounts can view permitted query builders"
                                                                                                                                                                              ON query_builders FOR SELECT
                                                                                                                                                                                USING (trigger_id IN (
                                                                                                                                                                                    SELECT t.id FROM triggers t
                                                                                                                                                                                        WHERE t.bot_id IN (SELECT get_my_accessible_bot_ids())
                                                                                                                                                                                          ));

                                                                                                                                                                                          -- ─── query_categories ─────────────────────────────────────────────────────────
                                                                                                                                                                                          CREATE POLICY "Sub-accounts can view permitted query categories"
                                                                                                                                                                                            ON query_categories FOR SELECT
                                                                                                                                                                                              USING (query_builder_id IN (
                                                                                                                                                                                                  SELECT qb.id FROM query_builders qb
                                                                                                                                                                                                      JOIN triggers t ON qb.trigger_id = t.id
                                                                                                                                                                                                          WHERE t.bot_id IN (SELECT get_my_accessible_bot_ids())
                                                                                                                                                                                                            ));

                                                                                                                                                                                                            -- ─── query_questions ──────────────────────────────────────────────────────────
                                                                                                                                                                                                            CREATE POLICY "Sub-accounts can view permitted query questions"
                                                                                                                                                                                                              ON query_questions FOR SELECT
                                                                                                                                                                                                                USING (category_id IN (
                                                                                                                                                                                                                    SELECT qc.id FROM query_categories qc
                                                                                                                                                                                                                        JOIN query_builders qb ON qc.query_builder_id = qb.id
                                                                                                                                                                                                                            JOIN triggers t ON qb.trigger_id = t.id
                                                                                                                                                                                                                                WHERE t.bot_id IN (SELECT get_my_accessible_bot_ids())
                                                                                                                                                                                                                                  ));

                                                                                                                                                                                                                                  -- ─── form_responses ───────────────────────────────────────────────────────────
                                                                                                                                                                                                                                  CREATE POLICY "Sub-accounts can view permitted form responses"
                                                                                                                                                                                                                                    ON form_responses FOR SELECT
                                                                                                                                                                                                                                      USING (form_id IN (
                                                                                                                                                                                                                                          SELECT f.id FROM forms f
                                                                                                                                                                                                                                              JOIN triggers t ON f.trigger_id = t.id
                                                                                                                                                                                                                                                  WHERE t.bot_id IN (SELECT get_my_accessible_bot_ids())
                                                                                                                                                                                                                                                    ));

                                                                                                                                                                                                                                                    -- ─── form_response_answers ────────────────────────────────────────────────────
                                                                                                                                                                                                                                                    CREATE POLICY "Sub-accounts can view permitted form response answers"
                                                                                                                                                                                                                                                      ON form_response_answers FOR SELECT
                                                                                                                                                                                                                                                        USING (response_id IN (
                                                                                                                                                                                                                                                            SELECT fr.id FROM form_responses fr
                                                                                                                                                                                                                                                                JOIN forms f ON fr.form_id = f.id
                                                                                                                                                                                                                                                                    JOIN triggers t ON f.trigger_id = t.id
                                                                                                                                                                                                                                                                        WHERE t.bot_id IN (SELECT get_my_accessible_bot_ids())
                                                                                                                                                                                                                                                                          ));

                                                                                                                                                                                                                                                                          -- ─── analytics_events ─────────────────────────────────────────────────────────
                                                                                                                                                                                                                                                                          CREATE POLICY "Sub-accounts can view permitted analytics"
                                                                                                                                                                                                                                                                            ON analytics_events FOR SELECT
                                                                                                                                                                                                                                                                              USING (bot_id IN (SELECT get_my_accessible_bot_ids()));

                                                                                                                                                                                                                                                                              -- ─── contacts ─────────────────────────────────────────────────────────────────
                                                                                                                                                                                                                                                                              CREATE POLICY "Sub-accounts can view permitted contacts"
                                                                                                                                                                                                                                                                                ON contacts FOR SELECT
                                                                                                                                                                                                                                                                                  USING (bot_id IN (SELECT get_my_accessible_bot_ids()));

                                                                                                                                                                                                                                                                                  -- ─── business_hours ───────────────────────────────────────────────────────────
                                                                                                                                                                                                                                                                                  CREATE POLICY "Sub-accounts can view permitted business hours"
                                                                                                                                                                                                                                                                                    ON business_hours FOR SELECT
                                                                                                                                                                                                                                                                                      USING (bot_id IN (SELECT get_my_accessible_bot_ids()));
                                                                                                                                                                                                                                                                                      