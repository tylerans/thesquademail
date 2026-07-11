ALTER TABLE domains ADD COLUMN IF NOT EXISTS dns_records jsonb DEFAULT '[]';
ALTER TABLE domains ADD COLUMN IF NOT EXISTS resend_domain_id text;