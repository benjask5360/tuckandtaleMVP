-- Create contact_submissions table for tracking contact form submissions
CREATE TABLE IF NOT EXISTS "public"."contact_submissions" (
  -- Primary identifier
  "id" UUID DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,

  -- Reference number for user-facing tracking (human-readable)
  "reference_number" TEXT NOT NULL UNIQUE,

  -- Contact information
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "message" TEXT NOT NULL,

  -- User relationship (optional - if logged in)
  "user_id" UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Status tracking
  "status" TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved', 'closed')),

  -- Email tracking
  "email_sent" BOOLEAN DEFAULT FALSE,
  "email_sent_at" TIMESTAMPTZ,
  "resend_message_id" TEXT,

  -- Metadata
  "user_agent" TEXT,
  "ip_address" TEXT,

  -- Timestamps
  "created_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  "resolved_at" TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX idx_contact_submissions_user_id ON contact_submissions(user_id);
CREATE INDEX idx_contact_submissions_status ON contact_submissions(status);
CREATE INDEX idx_contact_submissions_created_at ON contact_submissions(created_at DESC);
CREATE INDEX idx_contact_submissions_reference_number ON contact_submissions(reference_number);

-- Trigger for updated_at
CREATE TRIGGER handle_contact_submissions_updated_at
  BEFORE UPDATE ON contact_submissions
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- RLS Policies
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own submissions
CREATE POLICY "Users can view own submissions"
  ON contact_submissions FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Allow anyone to insert (for public contact form)
CREATE POLICY "Anyone can submit contact form"
  ON contact_submissions FOR INSERT
  WITH CHECK (true);

-- Grant permissions
GRANT SELECT, INSERT ON contact_submissions TO authenticated;
GRANT SELECT, INSERT ON contact_submissions TO anon;

-- Comments for documentation
COMMENT ON TABLE contact_submissions IS 'Contact form submissions with email tracking via Resend';
COMMENT ON COLUMN contact_submissions.reference_number IS 'User-facing reference number (e.g., CS-2025-001234)';
COMMENT ON COLUMN contact_submissions.resend_message_id IS 'Message ID returned from Resend API for tracking';
