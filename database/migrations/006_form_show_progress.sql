-- Add show_progress flag to forms table
-- When false, the "(Question X of Y)" footer is omitted from messages sent to users.

ALTER TABLE forms
  ADD COLUMN show_progress BOOLEAN NOT NULL DEFAULT false;
