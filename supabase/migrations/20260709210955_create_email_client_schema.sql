/*
# Email Client Schema

## Summary
Creates the full schema for a Gmail/Zoho-style email client with custom domain support.

## New Tables

### domains
Stores custom domains added by users. Each domain goes through a verification workflow
where the user adds DNS records (MX, SPF, DKIM) at their registrar, then we confirm them.
- id, user_id, domain_name, status (pending/verified/failed)
- mailgun_domain: identifier used in Mailgun API calls
- mx_record, spf_record, dkim_public_key, dkim_selector: DNS record values to show the user
- route_id: Mailgun inbound route ID for receiving emails

### email_accounts
Email addresses created on verified domains (e.g. hello@example.com).
- id, user_id, domain_id, address, display_name, signature, is_default

### emails
All email messages (inbox, sent, drafts, trash, spam, archive, starred).
- Standard email headers: from, to, cc, bcc, subject
- Body stored as both HTML and plain text
- Folder, read/starred/draft flags
- Thread tracking via thread_id and external_message_id headers

### email_labels
User-defined colored labels to tag emails.

### email_label_assignments
Many-to-many join between emails and labels.

### email_attachments
Attachment metadata; actual files stored in Supabase Storage.

### contacts
Address book entries per user.

## Security
- RLS enabled on all tables
- All policies scoped to authenticated users via auth.uid()
- Users can only access their own data

## Storage
- Creates 'email-attachments' storage bucket for attachment files
*/

-- Storage bucket for email attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'email-attachments',
  'email-attachments',
  false,
  52428800,  -- 50MB limit per file
  NULL       -- allow all MIME types
)
ON CONFLICT (id) DO NOTHING;

-- Domains table
CREATE TABLE IF NOT EXISTS domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  domain_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  mailgun_domain text,
  mx_record text,
  spf_record text,
  dkim_public_key text,
  dkim_selector text,
  route_id text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT domains_user_domain_unique UNIQUE (user_id, domain_name)
);

ALTER TABLE domains ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_domains" ON domains;
CREATE POLICY "select_own_domains" ON domains FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_domains" ON domains;
CREATE POLICY "insert_own_domains" ON domains FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_domains" ON domains;
CREATE POLICY "update_own_domains" ON domains FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_domains" ON domains;
CREATE POLICY "delete_own_domains" ON domains FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Email accounts table
CREATE TABLE IF NOT EXISTS email_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  domain_id uuid NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
  address text NOT NULL,
  display_name text NOT NULL DEFAULT '',
  signature text DEFAULT '',
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT email_accounts_address_unique UNIQUE (address)
);

ALTER TABLE email_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_accounts" ON email_accounts;
CREATE POLICY "select_own_accounts" ON email_accounts FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_accounts" ON email_accounts;
CREATE POLICY "insert_own_accounts" ON email_accounts FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_accounts" ON email_accounts;
CREATE POLICY "update_own_accounts" ON email_accounts FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_accounts" ON email_accounts;
CREATE POLICY "delete_own_accounts" ON email_accounts FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Emails table
CREATE TABLE IF NOT EXISTS emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES email_accounts(id) ON DELETE CASCADE,
  thread_id uuid,
  external_message_id text,
  in_reply_to text,
  folder text NOT NULL DEFAULT 'inbox',
  from_address text NOT NULL DEFAULT '',
  from_name text NOT NULL DEFAULT '',
  to_addresses jsonb NOT NULL DEFAULT '[]',
  cc_addresses jsonb NOT NULL DEFAULT '[]',
  bcc_addresses jsonb NOT NULL DEFAULT '[]',
  subject text NOT NULL DEFAULT '',
  body_html text NOT NULL DEFAULT '',
  body_text text NOT NULL DEFAULT '',
  is_read boolean NOT NULL DEFAULT false,
  is_starred boolean NOT NULL DEFAULT false,
  is_draft boolean NOT NULL DEFAULT false,
  received_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS emails_user_id_idx ON emails(user_id);
CREATE INDEX IF NOT EXISTS emails_account_id_idx ON emails(account_id);
CREATE INDEX IF NOT EXISTS emails_folder_idx ON emails(folder);
CREATE INDEX IF NOT EXISTS emails_thread_id_idx ON emails(thread_id);
CREATE INDEX IF NOT EXISTS emails_received_at_idx ON emails(received_at DESC);
CREATE INDEX IF NOT EXISTS emails_is_starred_idx ON emails(is_starred) WHERE is_starred = true;
CREATE INDEX IF NOT EXISTS emails_external_message_id_idx ON emails(external_message_id);

ALTER TABLE emails ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_emails" ON emails;
CREATE POLICY "select_own_emails" ON emails FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_emails" ON emails;
CREATE POLICY "insert_own_emails" ON emails FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_emails" ON emails;
CREATE POLICY "update_own_emails" ON emails FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_emails" ON emails;
CREATE POLICY "delete_own_emails" ON emails FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Email labels table
CREATE TABLE IF NOT EXISTS email_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#1a73e8',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT email_labels_user_name_unique UNIQUE (user_id, name)
);

ALTER TABLE email_labels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_labels" ON email_labels;
CREATE POLICY "select_own_labels" ON email_labels FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_labels" ON email_labels;
CREATE POLICY "insert_own_labels" ON email_labels FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_labels" ON email_labels;
CREATE POLICY "update_own_labels" ON email_labels FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_labels" ON email_labels;
CREATE POLICY "delete_own_labels" ON email_labels FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Email label assignments
CREATE TABLE IF NOT EXISTS email_label_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id uuid NOT NULL REFERENCES emails(id) ON DELETE CASCADE,
  label_id uuid NOT NULL REFERENCES email_labels(id) ON DELETE CASCADE,
  CONSTRAINT email_label_assignments_unique UNIQUE (email_id, label_id)
);

CREATE INDEX IF NOT EXISTS label_assignments_email_idx ON email_label_assignments(email_id);
CREATE INDEX IF NOT EXISTS label_assignments_label_idx ON email_label_assignments(label_id);

ALTER TABLE email_label_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_assignments" ON email_label_assignments;
CREATE POLICY "select_own_assignments" ON email_label_assignments FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM emails WHERE emails.id = email_label_assignments.email_id AND emails.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "insert_own_assignments" ON email_label_assignments;
CREATE POLICY "insert_own_assignments" ON email_label_assignments FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM emails WHERE emails.id = email_label_assignments.email_id AND emails.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "delete_own_assignments" ON email_label_assignments;
CREATE POLICY "delete_own_assignments" ON email_label_assignments FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM emails WHERE emails.id = email_label_assignments.email_id AND emails.user_id = auth.uid()
  ));

-- Email attachments
CREATE TABLE IF NOT EXISTS email_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id uuid NOT NULL REFERENCES emails(id) ON DELETE CASCADE,
  filename text NOT NULL,
  mime_type text NOT NULL DEFAULT 'application/octet-stream',
  file_size bigint NOT NULL DEFAULT 0,
  storage_path text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_attachments_email_idx ON email_attachments(email_id);

ALTER TABLE email_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_attachments" ON email_attachments;
CREATE POLICY "select_own_attachments" ON email_attachments FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM emails WHERE emails.id = email_attachments.email_id AND emails.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "insert_own_attachments" ON email_attachments;
CREATE POLICY "insert_own_attachments" ON email_attachments FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM emails WHERE emails.id = email_attachments.email_id AND emails.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "delete_own_attachments" ON email_attachments;
CREATE POLICY "delete_own_attachments" ON email_attachments FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM emails WHERE emails.id = email_attachments.email_id AND emails.user_id = auth.uid()
  ));

-- Storage policies for email attachments
DROP POLICY IF EXISTS "Users can upload their attachments" ON storage.objects;
CREATE POLICY "Users can upload their attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'email-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can read their attachments" ON storage.objects;
CREATE POLICY "Users can read their attachments"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'email-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Service role can manage attachments" ON storage.objects;
CREATE POLICY "Service role can manage attachments"
  ON storage.objects FOR ALL
  TO service_role
  USING (bucket_id = 'email-attachments');

-- Contacts table
CREATE TABLE IF NOT EXISTS contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  email text NOT NULL,
  avatar_url text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT contacts_user_email_unique UNIQUE (user_id, email)
);

CREATE INDEX IF NOT EXISTS contacts_user_id_idx ON contacts(user_id);
CREATE INDEX IF NOT EXISTS contacts_email_idx ON contacts(email);

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_contacts" ON contacts;
CREATE POLICY "select_own_contacts" ON contacts FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_contacts" ON contacts;
CREATE POLICY "insert_own_contacts" ON contacts FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_contacts" ON contacts;
CREATE POLICY "update_own_contacts" ON contacts FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_contacts" ON contacts;
CREATE POLICY "delete_own_contacts" ON contacts FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
