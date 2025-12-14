-- Create waitlist_therapistbacked table for therapist-backed stories waitlist
CREATE TABLE IF NOT EXISTS "public"."waitlist_therapistbacked" (
  -- Primary identifier
  "id" UUID DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,

  -- Contact information
  "email" TEXT NOT NULL UNIQUE,

  -- Email tracking
  "notification_sent" BOOLEAN DEFAULT FALSE,
  "notification_sent_at" TIMESTAMPTZ,
  "resend_message_id" TEXT,

  -- Metadata
  "user_agent" TEXT,
  "ip_address" TEXT,

  -- Timestamps
  "created_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_waitlist_therapistbacked_email ON waitlist_therapistbacked(email);
CREATE INDEX idx_waitlist_therapistbacked_created_at ON waitlist_therapistbacked(created_at DESC);

-- RLS Policies
ALTER TABLE waitlist_therapistbacked ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (for public waitlist form)
CREATE POLICY "Anyone can join waitlist"
  ON waitlist_therapistbacked FOR INSERT
  WITH CHECK (true);

-- Only allow reading own email (prevent enumeration)
CREATE POLICY "Users cannot read waitlist"
  ON waitlist_therapistbacked FOR SELECT
  USING (false);

-- Grant permissions
GRANT INSERT ON waitlist_therapistbacked TO authenticated;
GRANT INSERT ON waitlist_therapistbacked TO anon;

-- Comments for documentation
COMMENT ON TABLE waitlist_therapistbacked IS 'Waitlist signups for therapist-backed stories feature';
COMMENT ON COLUMN waitlist_therapistbacked.resend_message_id IS 'Message ID returned from Resend API for tracking';
