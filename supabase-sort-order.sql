-- Add sort_order column for user card ordering
-- Run in Supabase SQL Editor

ALTER TABLE worktrack_users ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 99;

-- Set admin first, คุณกิตติ second
UPDATE worktrack_users SET sort_order = 1 WHERE id = 'admin';
UPDATE worktrack_users SET sort_order = 2 WHERE name LIKE '%กิตติ%';
