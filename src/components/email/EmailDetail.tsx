import { useState, useEffect, useRef } from 'react';
import {
  Reply,
  Forward,
  Trash2,
  Archive,
  Star,
  Paperclip,
  Download,
  ChevronDown,
  X,
  MailOpen,
  ArrowLeft,
} from 'lucide-react';
import { useEmail } from '../../contexts/EmailContext';
import { Email, EmailAddress } from '../../lib/types';
import {
  formatFullDate,
  formatFileSize,
  getInitials,
  getAvatarColor,
  stripHtml,
} from '../../lib/utils';
import { supabase } from '../../lib/supabase';

export default function EmailDetail() {
  const { selectedEmail, setSelectedEmail, toggleStar, moveToFolder, deleteEmail, openCompose, selectedAccountId } =
    useEmail();
  const [showFullHeaders, setShowFullHeaders] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    setShowFullHeaders(false);
  }, [selectedEmail?.id]);

  if (!selectedEmail) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 text-slate-400">
        <MailOpen className="w-16 h-16 mb-4 opacity-20" />
        <p className="text-sm font-medium text-slate-500">Select an email to read</p>
        <p className="text-xs text-slate-400 mt-1">Pick from the list on the left</p>
      </div>
    );
  }

  const handleReply = () => {
    if (!selectedAccountId) return;
    openCompose({
      fromAccountId: selectedAccountId,
      to: [{ name: selectedEmail.from_name, email: selectedEmail.from_address }],
      subject: selectedEmail.subject.startsWith('Re: ')
        ? selectedEmail.subject
        : `Re: ${selectedEmail.subject}`,
      body: `\n\n---\nOn ${formatFullDate(selectedEmail.received_at)}, ${selectedEmail.from_name || selectedEmail.from_address} wrote:\n\n${stripHtml(selectedEmail.body_html || selectedEmail.body_text)}`,
      replyToEmailId: selectedEmail.id,
      inReplyTo: selectedEmail.external_message_id,
    });
  };

  const handleForward = () => {
    if (!selectedAccountId) return;
    openCompose({
      fromAccountId: selectedAccountId,
      subject: selectedEmail.subject.startsWith('Fwd: ')
        ? selectedEmail.subject
        : `Fwd: ${selectedEmail.subject}`,
      body: `\n\n------- Forwarded Message -------\nFrom: ${selectedEmail.from_address}\nDate: ${formatFullDate(selectedEmail.received_at)}\nSubject: ${selectedEmail.subject}\n\n${stripHtml(selectedEmail.body_html || selectedEmail.body_text)}`,
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-4 md:px-6 py-3 border-b border-slate-100">
        {/* Back button — mobile shows ArrowLeft to go back to list; desktop shows X to deselect */}
        <button
          onClick={() => setSelectedEmail(null)}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-all mr-1"
          title="Back"
        >
          <ArrowLeft className="w-4 h-4 md:hidden" />
          <X className="w-4 h-4 hidden md:block" />
        </button>

        <ActionButton icon={Archive} label="Archive" onClick={() => moveToFolder(selectedEmail.id, 'archive')} />
        <ActionButton icon={Trash2} label="Delete" onClick={() => deleteEmail(selectedEmail.id)} danger />
        <div className="w-px h-4 bg-slate-200 mx-1" />
        <ActionButton
          icon={Star}
          label={selectedEmail.is_starred ? 'Unstar' : 'Star'}
          onClick={() => toggleStar(selectedEmail.id)}
          active={selectedEmail.is_starred}
          activeColor="text-yellow-400"
        />
        <div className="flex-1" />
        <ActionButton icon={Reply} label="Reply" onClick={handleReply} />
        <ActionButton icon={Forward} label="Forward" onClick={handleForward} />
      </div>

      {/* Email content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 md:px-8 py-6">
          {/* Subject */}
          <h1 className="text-xl md:text-2xl font-semibold text-slate-900 mb-4 leading-tight">
            {selectedEmail.subject || '(no subject)'}
          </h1>

          {/* Sender info */}
          <div className="flex items-start gap-3 mb-6 p-4 bg-slate-50 rounded-xl">
            <SenderAvatar email={selectedEmail} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <span className="text-sm font-semibold text-slate-900">
                    {selectedEmail.from_name || selectedEmail.from_address}
                  </span>
                  {selectedEmail.from_name && (
                    <span className="text-xs text-slate-500 ml-1.5">
                      &lt;{selectedEmail.from_address}&gt;
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-400 flex-shrink-0">
                  {formatFullDate(selectedEmail.received_at)}
                </span>
              </div>

              <button
                onClick={() => setShowFullHeaders((v) => !v)}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 mt-1 transition-colors"
              >
                <span>
                  To: {formatAddresses(selectedEmail.to_addresses)}
                </span>
                <ChevronDown
                  className={`w-3 h-3 transition-transform ${showFullHeaders ? 'rotate-180' : ''}`}
                />
              </button>

              {showFullHeaders && (
                <div className="mt-2 space-y-1 text-xs text-slate-500">
                  {selectedEmail.cc_addresses.length > 0 && (
                    <p>CC: {formatAddresses(selectedEmail.cc_addresses)}</p>
                  )}
                  {selectedEmail.bcc_addresses.length > 0 && (
                    <p>BCC: {formatAddresses(selectedEmail.bcc_addresses)}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Attachments */}
          {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
            <div className="mb-6">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Paperclip className="w-3.5 h-3.5" />
                {selectedEmail.attachments.length} Attachment
                {selectedEmail.attachments.length > 1 ? 's' : ''}
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedEmail.attachments.map((att) => (
                  <AttachmentCard
                    key={att.id}
                    filename={att.filename}
                    size={att.file_size}
                    storagePath={att.storage_path}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Email body */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <EmailBody email={selectedEmail} iframeRef={iframeRef} />
          </div>

          {/* Reply / Forward buttons at bottom */}
          <div className="flex gap-3 mt-8">
            <button
              onClick={handleReply}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all"
            >
              <Reply className="w-4 h-4" /> Reply
            </button>
            <button
              onClick={handleForward}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all"
            >
              <Forward className="w-4 h-4" /> Forward
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  danger,
  active,
  activeColor,
}: {
  icon: typeof Reply;
  label: string;
  onClick: () => void;
  danger?: boolean;
  active?: boolean;
  activeColor?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
        danger
          ? 'text-slate-500 hover:bg-red-50 hover:text-red-600'
          : active
          ? `${activeColor ?? 'text-blue-600'} hover:bg-blue-50`
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
      }`}
    >
      <Icon
        className="w-4 h-4"
        fill={active && activeColor === 'text-yellow-400' ? 'currentColor' : 'none'}
      />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function SenderAvatar({ email }: { email: Email }) {
  const color = getAvatarColor(email.from_address);
  const initials = getInitials(email.from_name || email.from_address);
  return (
    <div
      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
      style={{ backgroundColor: color }}
    >
      {initials}
    </div>
  );
}

function EmailBody({
  email,
  iframeRef,
}: {
  email: Email;
  iframeRef: React.RefObject<HTMLIFrameElement>;
}) {
  const [iframeHeight, setIframeHeight] = useState(400);

  const content = email.body_html
    ? `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;line-height:1.6;color:#374151;padding:16px;margin:0}img{max-width:100%;height:auto}a{color:#1a73e8}blockquote{border-left:3px solid #e2e8f0;margin:0;padding-left:12px;color:#6b7280}</style></head><body>${email.body_html}</body></html>`
    : `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;line-height:1.6;color:#374151;padding:16px;margin:0;white-space:pre-wrap}</style></head><body>${email.body_text}</body></html>`;

  const handleLoad = () => {
    if (iframeRef.current?.contentDocument?.body) {
      const height = iframeRef.current.contentDocument.body.scrollHeight;
      setIframeHeight(Math.max(200, height + 32));
    }
  };

  return (
    <iframe
      ref={iframeRef}
      srcDoc={content}
      sandbox="allow-same-origin allow-popups"
      className="w-full block"
      style={{ height: iframeHeight, border: 'none' }}
      onLoad={handleLoad}
    />
  );
}

function AttachmentCard({
  filename,
  size,
  storagePath,
}: {
  filename: string;
  size: number;
  storagePath: string;
}) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    const { data } = await supabase.storage
      .from('email-attachments')
      .createSignedUrl(storagePath, 60);
    if (data?.signedUrl) {
      const a = document.createElement('a');
      a.href = data.signedUrl;
      a.download = filename;
      a.click();
    }
    setDownloading(false);
  };

  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  const extColor: Record<string, string> = {
    pdf: 'bg-red-100 text-red-600',
    doc: 'bg-blue-100 text-blue-600',
    docx: 'bg-blue-100 text-blue-600',
    xls: 'bg-green-100 text-green-600',
    xlsx: 'bg-green-100 text-green-600',
    jpg: 'bg-purple-100 text-purple-600',
    jpeg: 'bg-purple-100 text-purple-600',
    png: 'bg-purple-100 text-purple-600',
    zip: 'bg-yellow-100 text-yellow-600',
  };

  return (
    <div className="flex items-center gap-2.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors group">
      <span
        className={`text-xs font-bold px-1.5 py-0.5 rounded uppercase ${extColor[ext] ?? 'bg-slate-200 text-slate-600'}`}
      >
        {ext || 'file'}
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-700 truncate max-w-[140px]">{filename}</p>
        <p className="text-xs text-slate-400">{formatFileSize(size)}</p>
      </div>
      <button
        onClick={handleDownload}
        disabled={downloading}
        className="p-1 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-all ml-1 opacity-0 group-hover:opacity-100"
      >
        <Download className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function formatAddresses(addresses: EmailAddress[]): string {
  if (!addresses || addresses.length === 0) return '—';
  return addresses
    .map((a) => (a.name ? `${a.name} <${a.email}>` : a.email))
    .join(', ');
}
