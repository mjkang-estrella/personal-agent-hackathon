CREATE TABLE IF NOT EXISTS jobswitch_outlook_connections (
 workspace_id uuid PRIMARY KEY REFERENCES jobswitch_workspaces(id) ON DELETE CASCADE,
 generation uuid NOT NULL,
 email text,
 encrypted_refresh text,
 status text NOT NULL CHECK (status IN ('connecting','connected','reconnect')),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS jobswitch_outlook_oauth_states (
 state_hash text PRIMARY KEY,
 workspace_id uuid NOT NULL UNIQUE REFERENCES jobswitch_workspaces(id) ON DELETE CASCADE,
 generation uuid NOT NULL,
 encrypted_verifier text NOT NULL,
 expires_at timestamptz NOT NULL
);
