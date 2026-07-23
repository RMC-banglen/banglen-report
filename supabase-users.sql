-- User management for banglen-report
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS worktrack_users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  pin TEXT DEFAULT '',
  role TEXT DEFAULT 'editor',
  -- role: 'admin' | 'editor' | 'viewer'
  -- permissions: which tabs they can edit (for editor role)
  permissions JSONB DEFAULT '{"production":true,"maintenance":true,"raft":true}'::jsonb,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE worktrack_users DISABLE ROW LEVEL SECURITY;
GRANT ALL ON worktrack_users TO anon, authenticated, service_role;

-- Default admin user (PIN: 1234 — change after setup)
INSERT INTO worktrack_users (id, name, pin, role, permissions)
VALUES ('admin', 'Admin', '1234', 'admin', '{"production":true,"maintenance":true,"raft":true}')
ON CONFLICT (id) DO NOTHING;
