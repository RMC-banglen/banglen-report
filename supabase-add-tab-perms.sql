-- Add tab_perms column to worktrack_users
ALTER TABLE worktrack_users ADD COLUMN IF NOT EXISTS tab_perms JSONB DEFAULT '{"meeting":true,"quality":true,"overview":true,"compare":true,"damage":true,"concrete":true,"worktrack":true}'::jsonb;
