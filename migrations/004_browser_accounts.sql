-- Provider references only. Passwords are held by Kernel Managed Auth.
CREATE TABLE IF NOT EXISTS jobswitch_browser_accounts (
 id uuid PRIMARY KEY,
 workspace_id uuid NOT NULL REFERENCES jobswitch_workspaces(id) ON DELETE CASCADE,
 data jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS jobswitch_browser_accounts_workspace ON jobswitch_browser_accounts(workspace_id);
