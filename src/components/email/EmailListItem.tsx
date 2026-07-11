import { useState } from 'react';
import { Star, Paperclip, Trash2, Archive, MailOpen, Mail } from 'lucide-react';
import { useEmail } from '../../contexts/EmailContext';
import { Email } from '../../lib/types';
import { formatDate, getInitials, getAvatarColor, getEmailPreview } from '../../lib/utils';

export default function EmailListItem({ email }: { email: Email }) {
  const {
    selectedEmail,
    setSelectedEmail,
    toggleStar,
    moveToFolder,
    deleteEmail,
    selectedEmailIds,
    toggleEmailSelection,
    markRead,
  } = useEmail();
  const [hovered, setHovered] = useState(false);

  const isSelected = selectedEmail?.id === email.id;
  const isChecked = selectedEmailIds.has(email.id);
  const hasSelection = selectedEmailIds.size > 0;
  const avatarColor = getAvatarColor(email.from_address);
  const initials = getInitials(email.from_name || email.from_address);
  const preview = getEmailPreview(email.body_html, email.body_text);
  const showCheckbox = hovered || isChecked || hasSelection;

  return (
    <div
      onClick={() => {
        if (hasSelection) {
          toggleEmailSelection(email.id);
        } else {
          setSelectedEmail(email);
        }
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`relative flex items-start gap-3 px-4 py-3 cursor-pointer border-b border-slate-100 dark:border-gray-700 transition-all select-none ${
        isChecked
          ? 'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-l-blue-400'
          : isSelected
          ? 'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-l-blue-500'
          : !email.is_read
          ? 'bg-white dark:bg-gray-800 hover:bg-slate-50 dark:hover:bg-gray-750'
          : 'bg-white/60 dark:bg-gray-800/60 hover:bg-slate-50 dark:hover:bg-gray-750'
      }`}
    >
      {/* Avatar / Checkbox */}
      <div className="flex-shrink-0 mt-0.5 relative w-9 h-9">
        {showCheckbox ? (
          <button
            onClick={(e) => { e.stopPropagation(); toggleEmailSelection(email.id); }}
            className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
              isChecked
                ? 'bg-blue-600 border-blue-600'
                : 'bg-white dark:bg-gray-700 border-slate-300 dark:border-gray-500 hover:border-blue-400'
            }`}
          >
            {isChecked && (
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
        ) : (
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white"
            style={{ backgroundColor: avatarColor }}
          >
            {initials}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={`text-sm flex-1 truncate ${!email.is_read ? 'font-semibold text-slate-900 dark:text-gray-100' : 'font-normal text-slate-700 dark:text-gray-300'}`}>
            {email.from_name || email.from_address}
          </span>
          <span className="text-xs text-slate-400 dark:text-gray-600 flex-shrink-0 ml-2">
            {formatDate(email.received_at)}
          </span>
        </div>

        <p className={`text-sm truncate mb-0.5 ${!email.is_read ? 'font-medium text-slate-800 dark:text-gray-200' : 'text-slate-600 dark:text-gray-400'}`}>
          {email.is_draft && <span className="text-red-500 font-semibold mr-1">[Draft]</span>}
          {email.subject || '(no subject)'}
        </p>

        <p className="text-xs text-slate-400 dark:text-gray-600 truncate">{preview}</p>

        {email.labels && email.labels.length > 0 && (
          <div className="flex gap-1 mt-1.5 flex-wrap">
            {email.labels.map((label) => (
              <span key={label.id} className="px-1.5 py-0.5 rounded text-xs font-medium text-white" style={{ backgroundColor: label.color }}>
                {label.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Right actions */}
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <button
          onClick={(e) => { e.stopPropagation(); toggleStar(email.id); }}
          className={`p-0.5 rounded hover:scale-110 transition-transform ${email.is_starred ? 'text-yellow-400' : 'text-slate-300 dark:text-gray-600 hover:text-yellow-400'}`}
        >
          <Star className="w-3.5 h-3.5" fill={email.is_starred ? 'currentColor' : 'none'} />
        </button>

        {email.attachments && email.attachments.length > 0 && (
          <Paperclip className="w-3 h-3 text-slate-400 dark:text-gray-600" />
        )}

        {!email.is_read && <div className="w-2 h-2 rounded-full bg-blue-500 mt-1" />}
      </div>

      {/* Hover quick actions (shown on hover when no selection mode) */}
      {hovered && !hasSelection && (
        <div
          className="absolute right-10 top-1/2 -translate-y-1/2 flex items-center gap-0.5 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-600 rounded-lg shadow-sm px-1 py-0.5"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => moveToFolder(email.id, 'archive')}
            title="Archive"
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-gray-700 text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200 transition-all"
          >
            <Archive className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => deleteEmail(email.id)}
            title="Delete"
            className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-500 dark:text-gray-400 hover:text-red-500 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => markRead(email.id, !email.is_read)}
            title={email.is_read ? 'Mark unread' : 'Mark read'}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-gray-700 text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200 transition-all"
          >
            {email.is_read ? <Mail className="w-3.5 h-3.5" /> : <MailOpen className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}
    </div>
  );
}
