-- App ownership is separate from the provider's managed identity schema.
CREATE TABLE IF NOT EXISTS jobswitch_accounts (
  user_id text PRIMARY KEY,
  active_workspace_id uuid REFERENCES jobswitch_workspaces(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS jobswitch_workspace_owners (
  workspace_id uuid PRIMARY KEY REFERENCES jobswitch_workspaces(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES jobswitch_accounts(user_id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS jobswitch_workspace_owners_user_idx ON jobswitch_workspace_owners(user_id);
