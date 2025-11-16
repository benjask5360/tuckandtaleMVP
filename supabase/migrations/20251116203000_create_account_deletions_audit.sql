-- Create account_deletions audit table for compliance tracking

CREATE TABLE IF NOT EXISTS account_deletions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  user_email TEXT NOT NULL,
  deletion_type TEXT NOT NULL DEFAULT 'user_requested', -- 'user_requested', 'admin', 'gdpr_request'
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_by UUID, -- admin user who performed deletion (null if self-service)

  -- Pre-deletion statistics
  metadata JSONB DEFAULT '{}', -- Store counts: num_characters, num_stories, num_avatars, etc.

  -- Compliance fields
  stripe_customer_id TEXT,
  had_active_subscription BOOLEAN DEFAULT false,

  CONSTRAINT valid_deletion_type CHECK (deletion_type IN ('user_requested', 'admin', 'gdpr_request'))
);

-- Create indexes for querying
CREATE INDEX IF NOT EXISTS idx_account_deletions_deleted_at ON account_deletions(deleted_at);
CREATE INDEX IF NOT EXISTS idx_account_deletions_user_email ON account_deletions(user_email);
CREATE INDEX IF NOT EXISTS idx_account_deletions_deletion_type ON account_deletions(deletion_type);

-- Enable RLS
ALTER TABLE account_deletions ENABLE ROW LEVEL SECURITY;

-- Only allow admins to view deletion logs (service role)
CREATE POLICY "Only service role can access deletion logs"
  ON account_deletions
  FOR ALL
  USING (auth.role() = 'service_role');

COMMENT ON TABLE account_deletions IS 'Audit log of all account deletions for compliance and analytics';
COMMENT ON COLUMN account_deletions.metadata IS 'JSON object with pre-deletion statistics: {num_characters, num_stories, num_avatars, subscription_tier, etc}';
