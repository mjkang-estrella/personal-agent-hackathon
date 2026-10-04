CREATE TABLE IF NOT EXISTS jobswitch_workspaces (
 id uuid PRIMARY KEY,
 data jsonb NOT NULL,
 version integer NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS jobswitch_claims (
 id uuid PRIMARY KEY,
 workspace_id uuid NOT NULL REFERENCES jobswitch_workspaces(id) ON DELETE CASCADE,
 task_id text NOT NULL,
 token_hash text NOT NULL,
 payload jsonb NOT NULL,
 status text NOT NULL DEFAULT 'prepared' CHECK (status IN ('prepared','submitted')),
 submitted_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(workspace_id,task_id)
);
CREATE TABLE IF NOT EXISTS jobswitch_settings (key text PRIMARY KEY, value jsonb NOT NULL);
