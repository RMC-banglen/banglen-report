-- Fix RLS + grant permissions for worktrack tables
-- Run this in Supabase SQL Editor

ALTER TABLE worktrack_tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE worktrack_raft_parts DISABLE ROW LEVEL SECURITY;
ALTER TABLE worktrack_raft_info DISABLE ROW LEVEL SECURITY;

GRANT ALL ON worktrack_tasks TO anon, authenticated, service_role;
GRANT ALL ON worktrack_raft_parts TO anon, authenticated, service_role;
GRANT ALL ON worktrack_raft_info TO anon, authenticated, service_role;

-- Drop any existing RLS policies that might override DISABLE
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname, tablename FROM pg_policies
    WHERE tablename IN ('worktrack_tasks','worktrack_raft_parts','worktrack_raft_info')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
  END LOOP;
END;
$$;
