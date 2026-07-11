export interface Domain {
  id: string;
  user_id: string;
  domain_name: string;
  status: 'pending' | 'verified' | 'failed';
  mailgun_domain?: string;
  resend_domain_id?: string;
  dns_records?: DnsRecord[];
  mx_record?: string;
  spf_record?: string;
  dkim_public_key?: string;
  dkim_selector?: string;
  route_id?: string;
  created_at: string;
}

export interface EmailAccount {
  id: string;
  user_id: string;
  domain_id: string;
  address: string;
  display_name: string;
  signature: string;
  is_default: boolean;
  created_at: string;
  domain?: Domain;
}

export interface EmailAddress {
  name?: string;
  email: string;
}

export interface Email {
  id: string;
  user_id: string;
  account_id: string;
  thread_id?: string;
  external_message_id?: string;
  in_reply_to?: string;
  folder: EmailFolder;
  from_address: string;
  from_name: string;
  to_addresses: EmailAddress[];
  cc_addresses: EmailAddress[];
  bcc_addresses: EmailAddress[];
  subject: string;
  body_html: string;
  body_text: string;
  is_read: boolean;
  is_starred: boolean;
  is_draft: boolean;
  received_at: string;
  created_at: string;
  attachments?: EmailAttachment[];
  labels?: EmailLabel[];
}

export type EmailFolder = 'inbox' | 'sent' | 'drafts' | 'trash' | 'spam' | 'archive';

export interface EmailLabel {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface EmailAttachment {
  id: string;
  email_id: string;
  filename: string;
  mime_type: string;
  file_size: number;
  storage_path: string;
  created_at: string;
}

export interface Contact {
  id: string;
  user_id: string;
  name: string;
  email: string;
  avatar_url: string;
  created_at: string;
}

export type SidebarFolder = EmailFolder | 'starred';

export interface ComposeData {
  to: EmailAddress[];
  cc: EmailAddress[];
  bcc: EmailAddress[];
  subject: string;
  body: string;
  fromAccountId: string;
  replyToEmailId?: string;
  inReplyTo?: string;
}

export type ActiveView = 'mail' | 'contacts' | 'settings';

export interface DnsRecord {
  record: string;
  type: string;
  host: string;
  value: string;
  priority: number | null;
  valid: boolean;
}
