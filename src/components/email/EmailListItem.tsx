import { useState } from 'react';
import { Star, Paperclip, MoreVertical, Trash2, Archive, MailOpen, Mail } from 'lucide-react';
import { useEmail } from '../../contexts/EmailContext';
import { Email } from '../../lib/types';
import { formatDate, getInitials, getAvatarColor, getEmailPreview } from '../../lib/utils';

export default function EmailListItem({ email }: { email: Email }) {
  const { selectedEmail, setSelectedEmail, toggleStar, moveToFolder, deleteEmail } = useEmail();
  const [menuOpen, setMenuOpen] = useState(false);

  const isSelected = selectedEmail?.id === email.id;
  const avatarSeed = email.from_address;
  const avatarColor = getAvatarColor(avatarSeed);
  const initials = getInitials(email.from_name || email.from_address);
  const preview = getEmailPreview(email.body_html, email.body_text);

  const handleClick = () => {
    setSelectedEmail(email);
  };

  const handleStarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleStar(email.id);
  };

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen((v) => !v);
  };

  return (
    <div
      onClick={handleClick}
      className={`relative flex items-start gap-3 px-4 py-3 cursor-pointer border-b border-slate-100 transition-all select-none ${
        isSelected
          ? 'bg-blue-50 border-l-2 border-l-blue-500'
          : !email.is_read
          ? 'bg-white hover:bg-slate-50'
          : 'bg-white/60 hover:bg-slate-50'
      }`}
    >
      {/* Avatar */}
      <div
        className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white mt-0.5"
        style={{ backgroundColor: avatarColor }}
      >
        {initials}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span
            className={`text-sm flex-1 truncate ${
              !email.is_read ? 'font-semibold text-slate-900' : 'font-normal text-slate-700'
            }`}
          >
            {email.from_name || email.from_address}
          </span>
          <span className="text-xs text-slate-400 flex-shrink-0 ml-2">
            {formatDate(email.received_at)}
          </span>
        </div>

        <p
          className={`text-sm truncate mb-0.5 ${
            !email.is_read ? 'font-medium text-slate-800' : 'text-slate-600'
          }`}
        >
          {email.is_draft && (
            <span className="text-red-500 font-semibold mr-1">[Draft]</span>
          )}
          {email.subject || '(no subject)'}
        </p>

        <p className="text-xs text-slate-400 truncate">{preview}</p>

        {/* Labels */}
        {email.labels && email.labels.length > 0 && (
          <div className="flex gap-1 mt-1.5 flex-wrap">
            {email.labels.map((label) => (
              <span
                key={label.id}
                className="px-1.5 py-0.5 rounded text-xs font-medium text-white"
                style={{ backgroundColor: label.color }}
              >
                {label.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Right actions */}
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <button
          onClick={handleStarClick}
          className={`p-0.5 rounded hover:scale-110 transition-transform ${
            email.is_starred ? 'text-yellow-400' : 'text-slate-300 hover:text-yellow-400'
          }`}
        >
          <Star className="w-3.5 h-3.5" fill={email.is_starred ? 'currentColor' : 'none'} />
        </button>

        {email.attachments && email.attachments.length > 0 && (
          <Paperclip className="w-3 h-3 text-slate-400" />
        )}

        {!email.is_read && (
          <div className="w-2 h-2 rounded-full bg-blue-500 mt-1" />
        )}
      </div>

      {/* Context menu */}
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
          <div className="absolute right-2 top-8 z-40 bg-white rounded-lg shadow-lg border border-slate-200 py-1 w-44 text-sm">
            <button
              onClick={(e) => { e.stopPropagation(); moveToFolder(email.id, 'archive'); setMenuOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 text-slate-700"
            >
              <Archive className="w-3.5 h-3.5" /> Archive
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); moveToFolder(email.id, email.is_read ? 'inbox' : 'inbox'); setMenuOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 text-slate-700"
            >
              {email.is_read ? <Mail className="w-3.5 h-3.5" /> : <MailOpen className="w-3.5 h-3.5" />}
              Mark as {email.is_read ? 'unread' : 'read'}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); deleteEmail(email.id); setMenuOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-red-50 text-red-600"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          </div>
        </>
      )}

      {/* Hover menu trigger */}
      <button
        onClick={handleMenuClick}
        className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-slate-200 opacity-0 group-hover:opacity-100 transition-opacity text-slate-500"
      >
        <MoreVertical className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
