import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import {
  X,
  Minus,
  Maximize2,
  Send,
  Paperclip,
  Trash2,
  Loader2,
  FileText,
  HardDrive,
} from 'lucide-react';
import { useEmail } from '../../contexts/EmailContext';
import { useAuth } from '../../contexts/AuthContext';
import { EmailAddress } from '../../lib/types';
import { formatFileSize, generateMessageId, stripHtml } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { openDrivePicker, isDriveConfigured, DriveFile } from '../../lib/googleDrive';
import RichTextEditor from './RichTextEditor';

interface AttachmentFile {
  file: File;
  id: string;
  uploading: boolean;
  storagePath?: string;
}

interface DriveLink {
  id: string;
  name: string;
  url: string;
}

export default function ComposeModal() {
  const { composeData, closeCompose, accounts, selectedAccountId, reloadEmails } = useEmail();
  const { user } = useAuth();

  const [minimized, setMinimized] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const [sending, setSending] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [fromAccountId, setFromAccountId] = useState(
    composeData?.fromAccountId || selectedAccountId || accounts[0]?.id || ''
  );
  const [to, setTo] = useState<EmailAddress[]>(composeData?.to || []);
  const [cc, setCc] = useState<EmailAddress[]>(composeData?.cc || []);
  const [bcc, setBcc] = useState<EmailAddress[]>(composeData?.bcc || []);
  const [subject, setSubject] = useState(composeData?.subject || '');
  const [bodyHtml, setBodyHtml] = useState(
    composeData?.body ? composeData.body.replace(/\n/g, '<br>') : ''
  );
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const [driveLinks, setDriveLinks] = useState<DriveLink[]>([]);
  const [drivePickerLoading, setDrivePickerLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fromAccount = accounts.find((a) => a.id === fromAccountId) || accounts[0];

  useEffect(() => {
    if (composeData?.fromAccountId) setFromAccountId(composeData.fromAccountId);
    if (composeData?.to) setTo(composeData.to);
    if (composeData?.cc) setCc(composeData.cc);
    if (composeData?.bcc) setBcc(composeData.bcc);
    if (composeData?.subject) setSubject(composeData.subject);
    if (composeData?.body) setBodyHtml(composeData.body.replace(/\n/g, '<br>'));
    if (composeData?.cc && composeData.cc.length > 0) setShowCc(true);
    if (composeData?.bcc && composeData.bcc.length > 0) setShowBcc(true);
  }, [composeData]);

  useEffect(() => {
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    if (!fromAccount || (to.length === 0 && !subject && !bodyHtml)) return;

    draftTimerRef.current = setTimeout(async () => {
      await saveDraft();
    }, 3000);

    return () => { if (draftTimerRef.current) clearTimeout(draftTimerRef.current); };
  }, [to, cc, bcc, subject, bodyHtml, fromAccountId]);

  const saveDraft = async () => {
    if (!user || !fromAccount) return;
    setSavingDraft(true);
    const payload = {
      user_id: user.id,
      account_id: fromAccount.id,
      folder: 'drafts' as const,
      from_address: fromAccount.address,
      from_name: fromAccount.display_name,
      to_addresses: to,
      cc_addresses: cc,
      bcc_addresses: bcc,
      subject,
      body_html: bodyHtml,
      body_text: stripHtml(bodyHtml),
      is_draft: true,
      is_read: true,
    };

    if (draftId) {
      await supabase.from('emails').update(payload).eq('id', draftId);
    } else {
      const { data } = await supabase.from('emails').insert(payload).select('id').single();
      if (data) setDraftId(data.id);
    }
    setSavingDraft(false);
  };

  const handleSend = async () => {
    if (!fromAccount || to.length === 0) {
      setError('Please add at least one recipient.');
      return;
    }
    setError(null);
    setSending(true);

    try {
      const messageId = generateMessageId(fromAccount.address.split('@')[1]);
      const readyAttachments = attachments.filter((a) => a.storagePath);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from_address: fromAccount.address,
            from_name: fromAccount.display_name,
            to: to.map((a) => (a.name ? `${a.name} <${a.email}>` : a.email)),
            cc: cc.map((a) => (a.name ? `${a.name} <${a.email}>` : a.email)),
            bcc: bcc.map((a) => (a.name ? `${a.name} <${a.email}>` : a.email)),
            subject,
            html: bodyHtml,
            text: stripHtml(bodyHtml),
            message_id: messageId,
            in_reply_to: composeData?.inReplyTo,
            account_id: fromAccount.id,
            attachments: readyAttachments.map((a) => ({
              filename: a.file.name,
              storage_path: a.storagePath,
            })),
          }),
        }
      );

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to send email');

      if (draftId) {
        await supabase.from('emails').delete().eq('id', draftId);
      }

      reloadEmails();
      closeCompose();
    } catch (err: any) {
      setError(err.message || 'Failed to send email');
    } finally {
      setSending(false);
    }
  };

  const handleAttachFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!user) return;

    for (const file of files) {
      const id = Math.random().toString(36).slice(2);
      setAttachments((prev) => [...prev, { file, id, uploading: true }]);
      const path = `${user.id}/${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage.from('email-attachments').upload(path, file);
      setAttachments((prev) =>
        prev.map((a) => a.id === id ? { ...a, uploading: false, storagePath: error ? undefined : data?.path } : a)
      );
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleDiscard = async () => {
    if (draftId) {
      await supabase.from('emails').delete().eq('id', draftId);
      reloadEmails();
    }
    closeCompose();
  };

  const handleDrivePicker = async () => {
    setDrivePickerLoading(true);
    setError(null);
    try {
      const files = await openDrivePicker();
      if (files.length > 0) {
        const newLinks: DriveLink[] = files.map((f: DriveFile) => ({ id: f.id, name: f.name, url: f.url }));
        setDriveLinks((prev) => [...prev, ...newLinks]);
        const linkHtml = files
          .map((f: DriveFile) => `<p><a href="${f.url}" target="_blank">[Google Drive] ${f.name}</a></p>`)
          .join('');
        setBodyHtml((prev) => prev + linkHtml);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to open Google Drive picker');
    } finally {
      setDrivePickerLoading(false);
    }
  };

  const removeDriveLink = (id: string) => {
    setDriveLinks((prev) => prev.filter((l) => l.id !== id));
  };

  const modalClass = maximized
    ? 'fixed inset-4 z-50'
    : 'fixed inset-0 z-50 md:inset-auto md:bottom-0 md:right-6 md:w-[540px]';

  if (minimized) {
    return (
      <div className="fixed bottom-0 right-6 z-50 w-64">
        <div
          className="flex items-center justify-between px-4 py-2.5 bg-gray-900 text-white rounded-t-xl cursor-pointer hover:bg-gray-700 transition-colors"
          onClick={() => setMinimized(false)}
        >
          <span className="text-sm font-medium truncate">{subject || 'New Message'}</span>
          <div className="flex items-center gap-1 ml-2">
            {savingDraft && <span className="text-xs text-gray-400">Saving...</span>}
            <Minus className="w-4 h-4" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${modalClass} flex flex-col bg-white dark:bg-gray-800 md:rounded-t-xl shadow-2xl border border-slate-200 dark:border-gray-700`}
      style={maximized ? {} : { maxHeight: '100dvh' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900 text-white rounded-t-xl flex-shrink-0">
        <span className="text-sm font-medium">
          {composeData?.replyToEmailId ? 'Reply' : 'New Message'}
        </span>
        <div className="flex items-center gap-1">
          {savingDraft && <span className="text-xs text-gray-400 mr-2">Draft saved</span>}
          <button onClick={() => setMinimized(true)} className="p-1 hover:bg-gray-700 rounded">
            <Minus className="w-4 h-4" />
          </button>
          <button onClick={() => setMaximized((v) => !v)} className="p-1 hover:bg-gray-700 rounded">
            <Maximize2 className="w-4 h-4" />
          </button>
          <button onClick={handleDiscard} className="p-1 hover:bg-gray-700 rounded ml-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-col flex-1 overflow-hidden">
        {/* From */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-100 dark:border-gray-700">
          <span className="text-xs text-slate-500 dark:text-gray-400 w-10 flex-shrink-0">From</span>
          {accounts.length > 1 ? (
            <select
              value={fromAccountId}
              onChange={(e) => setFromAccountId(e.target.value)}
              className="flex-1 text-sm text-slate-800 dark:text-gray-200 bg-transparent focus:outline-none"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.display_name} &lt;{a.address}&gt;</option>
              ))}
            </select>
          ) : (
            <span className="text-sm text-slate-800 dark:text-gray-200">
              {fromAccount?.display_name} &lt;{fromAccount?.address}&gt;
            </span>
          )}
        </div>

        <AddressField label="To" addresses={to} onChange={setTo}
          extra={
            <div className="flex gap-2 ml-auto text-xs text-blue-600">
              {!showCc && <button onClick={() => setShowCc(true)} className="hover:underline">Cc</button>}
              {!showBcc && <button onClick={() => setShowBcc(true)} className="hover:underline">Bcc</button>}
            </div>
          }
        />
        {showCc && <AddressField label="Cc" addresses={cc} onChange={setCc} />}
        {showBcc && <AddressField label="Bcc" addresses={bcc} onChange={setBcc} />}

        {/* Subject */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-100 dark:border-gray-700">
          <span className="text-xs text-slate-500 dark:text-gray-400 w-10 flex-shrink-0">Subject</span>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            className="flex-1 text-sm text-slate-900 dark:text-gray-100 focus:outline-none bg-transparent placeholder:text-slate-400 dark:placeholder:text-gray-600"
          />
        </div>

        {/* Rich Text Body */}
        <RichTextEditor
          value={bodyHtml}
          onChange={setBodyHtml}
          minHeight={maximized ? 400 : 180}
        />

        {/* Signature */}
        {fromAccount?.signature && (
          <div className="px-4 pb-2 border-t border-slate-100 dark:border-gray-700 pt-2">
            <p className="text-xs text-slate-400 dark:text-gray-500 mb-1">-- </p>
            <p className="whitespace-pre-wrap text-slate-500 dark:text-gray-400 text-xs">{fromAccount.signature}</p>
          </div>
        )}

        {/* Attachments */}
        {attachments.length > 0 && (
          <div className="px-4 py-2 border-t border-slate-100 dark:border-gray-700 flex flex-wrap gap-2">
            {attachments.map((att) => (
              <div key={att.id} className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 dark:bg-gray-700 rounded-lg text-xs">
                {att.uploading ? <Loader2 className="w-3 h-3 animate-spin text-blue-500" /> : <FileText className="w-3 h-3 text-slate-500 dark:text-gray-400" />}
                <span className="text-slate-700 dark:text-gray-300 max-w-[120px] truncate">{att.file.name}</span>
                <span className="text-slate-400 dark:text-gray-500">{formatFileSize(att.file.size)}</span>
                <button onClick={() => removeAttachment(att.id)} className="text-slate-400 hover:text-slate-600 dark:hover:text-gray-200 ml-0.5">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Drive links */}
        {driveLinks.length > 0 && (
          <div className="px-4 py-2 border-t border-slate-100 dark:border-gray-700 flex flex-wrap gap-2">
            {driveLinks.map((link) => (
              <div key={link.id} className="flex items-center gap-1.5 px-2 py-1 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-xs">
                <HardDrive className="w-3 h-3 text-green-600 dark:text-green-400" />
                <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-green-700 dark:text-green-400 max-w-[140px] truncate hover:underline">
                  {link.name}
                </a>
                <button onClick={() => removeDriveLink(link.id)} className="text-green-500 hover:text-green-700 ml-0.5">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="mx-4 mb-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-xs text-red-600 dark:text-red-400 border border-red-100 dark:border-red-800">
            {error}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center gap-2 px-4 py-3 border-t border-slate-100 dark:border-gray-700 flex-shrink-0">
          <button
            onClick={handleSend}
            disabled={sending || to.length === 0}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Send
          </button>

          <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleAttachFile} />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-700 text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200 transition-all"
            title="Attach file"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          {isDriveConfigured() && (
            <button
              onClick={handleDrivePicker}
              disabled={drivePickerLoading}
              className="p-2 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 text-slate-500 dark:text-gray-400 hover:text-green-600 transition-all disabled:opacity-50"
              title="Attach from Google Drive"
            >
              {drivePickerLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <HardDrive className="w-4 h-4" />}
            </button>
          )}

          <div className="flex-1" />

          <button
            onClick={handleDiscard}
            className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 dark:text-gray-500 hover:text-red-500 transition-all"
            title="Discard"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function AddressField({
  label, addresses, onChange, extra,
}: {
  label: string; addresses: EmailAddress[]; onChange: (addr: EmailAddress[]) => void; extra?: React.ReactNode;
}) {
  const [inputVal, setInputVal] = useState('');

  const addAddress = (val: string) => {
    const trimmed = val.trim();
    if (!trimmed) return;
    const emailMatch = trimmed.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    const nameEmailMatch = trimmed.match(/^(.*?)\s*<([^\s@]+@[^\s@]+\.[^\s@]+)>\s*$/);
    if (nameEmailMatch) {
      onChange([...addresses, { name: nameEmailMatch[1].trim(), email: nameEmailMatch[2] }]);
    } else if (emailMatch) {
      onChange([...addresses, { email: trimmed }]);
    }
    setInputVal('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addAddress(inputVal); }
    else if (e.key === 'Backspace' && !inputVal && addresses.length > 0) onChange(addresses.slice(0, -1));
  };

  return (
    <div className="flex items-start gap-2 px-4 py-2 border-b border-slate-100 dark:border-gray-700 min-h-[36px]">
      <span className="text-xs text-slate-500 dark:text-gray-400 w-10 flex-shrink-0 pt-1">{label}</span>
      <div className="flex-1 flex flex-wrap items-center gap-1.5 min-w-0">
        {addresses.map((addr, i) => (
          <span key={i} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 text-xs">
            {addr.name || addr.email}
            <button onClick={() => onChange(addresses.filter((_, j) => j !== i))} className="hover:text-blue-600">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => addAddress(inputVal)}
          placeholder={addresses.length === 0 ? 'name@example.com' : ''}
          className="flex-1 min-w-[100px] text-sm text-slate-900 dark:text-gray-100 focus:outline-none bg-transparent placeholder:text-slate-400 dark:placeholder:text-gray-600"
        />
      </div>
      {extra}
    </div>
  );
}
