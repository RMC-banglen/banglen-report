-- WorkTrack tables for banglen-report
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS worktrack_tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  type TEXT DEFAULT '',
  dept TEXT DEFAULT 'production',
  status TEXT DEFAULT 'todo',
  priority TEXT DEFAULT 'normal',
  pct INTEGER DEFAULT 0,
  due TEXT DEFAULT '',
  stage TEXT DEFAULT '',
  note TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS worktrack_raft_parts (
  raft_num INTEGER NOT NULL,
  part TEXT NOT NULL,
  bad BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (raft_num, part)
);

CREATE TABLE IF NOT EXISTS worktrack_raft_info (
  raft_num INTEGER PRIMARY KEY,
  pile_type TEXT DEFAULT 'S',
  section TEXT DEFAULT '22',
  changing BOOLEAN DEFAULT FALSE,
  waiting BOOLEAN DEFAULT FALSE,
  pending_type TEXT DEFAULT '',
  pending_section TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE worktrack_tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE worktrack_raft_parts DISABLE ROW LEVEL SECURITY;
ALTER TABLE worktrack_raft_info DISABLE ROW LEVEL SECURITY;
