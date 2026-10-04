CREATE TABLE IF NOT EXISTS jobswitch_connections (
 workspace_id uuid NOT NULL REFERENCES jobswitch_workspaces(id) ON DELETE CASCADE,
 service text NOT NULL,
 generation uuid NOT NULL,
 account_id text,
 email text,
 encrypted_refresh text,
 status text NOT NULL CHECK(status IN ('connecting','connected','reconnect')),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(workspace_id,service)
);
CREATE TABLE IF NOT EXISTS jobswitch_connection_states (
 state_hash text PRIMARY KEY,
 workspace_id uuid NOT NULL REFERENCES jobswitch_workspaces(id) ON DELETE CASCADE,
 service text NOT NULL,
 generation uuid NOT NULL,
 encrypted_verifier text NOT NULL,
 expires_at timestamptz NOT NULL,
 UNIQUE(workspace_id,service)
);
CREATE TABLE IF NOT EXISTS jobswitch_calendar_events (
 workspace_id uuid NOT NULL REFERENCES jobswitch_workspaces(id) ON DELETE CASCADE,
 service text NOT NULL,
 task_id text NOT NULL,
 request_id uuid NOT NULL,
 account_id text NOT NULL,
 payload jsonb NOT NULL,
 status text NOT NULL CHECK(status IN ('pending','created','failed','unknown')),
 external_id text,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(workspace_id,service,task_id)
);
