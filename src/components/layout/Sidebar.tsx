import { useState } from 'react';
import {
  Inbox,
  Send,
  FileText,
  Trash2,
  AlertOctagon,
  Archive,
  Star,
  ChevronDown,
  Plus,
  Settings,
  Users,
  Tag,
  PenSquare,
  Mail,
  LogOut,
  ChevronRight,
  Download,
  CheckCircle2,
  X,
} from 'lucide-react';
import { useEmail } from '../../contexts/EmailContext';
import { useAuth } from '../../contexts/AuthContext';
import { SidebarFolder, EmailAccount } from '../../lib/types';
import { getInitials, getAvatarColor } from '../../lib/utils';
import { usePWAInstall } from '../../hooks/usePWAInstall';

const FOLDERS: { id: SidebarFolder; label: string; icon: typeof Inbox }[] = [
  { id: 'inbox', label: 'Inbox', icon: Inbox },
  { id: 'starred', label: 'Starred', icon: Star },
  { id: 'sent', label: 'Sent', icon: Send },
  { id: 'drafts', label: 'Drafts', icon: FileText },
  { id: 'archive', label: 'Archive', icon: Archive },
  { id: 'spam', label: 'Spam', icon: AlertOctagon },
  { id: 'trash', label: 'Trash', icon: Trash2 },
];

export default function Sidebar() {
  const { user, signOut } = useAuth();
  const {
    accounts,
    selectedAccountId,
    setSelectedAccountId,
    currentFolder,
    setCurrentFolder,
    setSelectedEmail,
    setSearchQuery,
    unreadCounts,
    labels,
    openCompose,
    setActiveView,
    activeView,
    setSidebarOpen,
  } = useEmail();

  const { canInstall, install, installed } = usePWAInstall();
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [labelsExpanded, setLabelsExpanded] = useState(true);
  const [installDismissed, setInstallDismissed] = useState(false);

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);

  const handleFolderClick = (folder: SidebarFolder) => {
    setCurrentFolder(folder);
    setSelectedEmail(null);
    setSearchQuery('');
    setActiveView('mail');
    setSidebarOpen(false);
  };

  const handleViewChange = (view: 'contacts' | 'settings') => {
    setActiveView(view);
    setSidebarOpen(false);
  };

  return (
    <aside className="w-64 flex-shrink-0 bg-[#f6f8fc] border-r border-slate-200 flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 pt-4 pb-2 flex items-center gap-2">
        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
          <Mail className="w-5 h-5 text-white" />
        </div>
        <span className="text-lg font-bold text-slate-800 tracking-tight">MailFlow</span>
        {/* Close button on mobile */}
        <button
          className="ml-auto p-1 rounded-lg hover:bg-slate-200 text-slate-500 md:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Compose button */}
      <div className="px-4 py-3">
        <button
          onClick={() => {
            openCompose(selectedAccountId ? { fromAccountId: selectedAccountId } : {});
            setSidebarOpen(false);
          }}
          className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white shadow-sm border border-slate-200 hover:shadow-md transition-all text-slate-700 font-medium text-sm w-full group"
        >
          <PenSquare className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" />
          Compose
        </button>
      </div>

      {/* Folders */}
      <nav className="flex-1 overflow-y-auto px-2 py-1 min-h-0">
        <div className="space-y-0.5">
          {FOLDERS.map(({ id, label, icon: Icon }) => {
            const isActive = activeView === 'mail' && currentFolder === id;
            const count = id === 'starred' ? undefined : unreadCounts[id];
            return (
              <button
                key={id}
                onClick={() => handleFolderClick(id)}
                className={`w-full flex items-center gap-3 px-3 py-1.5 rounded-xl text-sm transition-all ${
                  isActive
                    ? 'bg-blue-100 text-blue-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-blue-600' : ''}`} />
                <span className="flex-1 text-left">{label}</span>
                {count != null && count > 0 && (
                  <span
                    className={`text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center ${
                      isActive ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {count > 99 ? '99+' : count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Labels section */}
        {labels.length > 0 && (
          <div className="mt-4">
            <button
              onClick={() => setLabelsExpanded((v) => !v)}
              className="w-full flex items-center gap-2 px-3 py-1 text-xs font-semibold text-slate-500 uppercase tracking-wider hover:text-slate-700 transition-colors"
            >
              <Tag className="w-3.5 h-3.5" />
              Labels
              {labelsExpanded ? (
                <ChevronDown className="w-3 h-3 ml-auto" />
              ) : (
                <ChevronRight className="w-3 h-3 ml-auto" />
              )}
            </button>
            {labelsExpanded && (
              <div className="mt-1 space-y-0.5">
                {labels.map((label) => (
                  <div
                    key={label.id}
                    className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-sm text-slate-600 hover:bg-slate-200/70 cursor-pointer"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: label.color }}
                    />
                    <span className="truncate">{label.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </nav>

      {/* PWA Install banner */}
      {canInstall && !installDismissed && (
        <div className="mx-2 mb-2 rounded-xl bg-blue-50 border border-blue-100 p-3">
          <div className="flex items-start justify-between gap-2 mb-2">
            <p className="text-xs font-semibold text-blue-800">Install MailFlow</p>
            <button
              onClick={() => setInstallDismissed(true)}
              className="text-blue-400 hover:text-blue-600 flex-shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-xs text-blue-600 mb-2.5">Add to your home screen for quick access.</p>
          <button
            onClick={install}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Install App
          </button>
        </div>
      )}
      {installed && (
        <div className="mx-2 mb-2 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-50 text-green-700 text-xs">
          <CheckCircle2 className="w-3.5 h-3.5" />
          App installed
        </div>
      )}

      {/* Bottom actions */}
      <div className="border-t border-slate-200 p-2 space-y-0.5">
        <button
          onClick={() => handleViewChange('contacts')}
          className={`w-full flex items-center gap-3 px-3 py-1.5 rounded-xl text-sm transition-all ${
            activeView === 'contacts'
              ? 'bg-blue-100 text-blue-700 font-semibold'
              : 'text-slate-600 hover:bg-slate-200/70'
          }`}
        >
          <Users className="w-4 h-4 flex-shrink-0" />
          Contacts
        </button>
        <button
          onClick={() => handleViewChange('settings')}
          className={`w-full flex items-center gap-3 px-3 py-1.5 rounded-xl text-sm transition-all ${
            activeView === 'settings'
              ? 'bg-blue-100 text-blue-700 font-semibold'
              : 'text-slate-600 hover:bg-slate-200/70'
          }`}
        >
          <Settings className="w-4 h-4 flex-shrink-0" />
          Settings
        </button>
      </div>

      {/* Account switcher */}
      <div className="border-t border-slate-200 p-2">
        {accounts.length === 0 ? (
          <button
            onClick={() => handleViewChange('settings')}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-blue-600 hover:bg-blue-50 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add email account
          </button>
        ) : (
          <div className="relative">
            <button
              onClick={() => setAccountMenuOpen((v) => !v)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-200/70 transition-all"
            >
              <AccountAvatar account={selectedAccount} />
              <div className="flex-1 min-w-0 text-left">
                <p className="text-xs font-semibold text-slate-800 truncate">
                  {selectedAccount?.display_name || selectedAccount?.address || user?.email}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {selectedAccount?.address || user?.email}
                </p>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
            </button>

            {accountMenuOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-1 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden z-50">
                {accounts.map((account) => (
                  <button
                    key={account.id}
                    onClick={() => {
                      setSelectedAccountId(account.id);
                      setAccountMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-slate-50 transition-colors ${
                      account.id === selectedAccountId ? 'bg-blue-50' : ''
                    }`}
                  >
                    <AccountAvatar account={account} size="sm" />
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-xs font-medium text-slate-800 truncate">{account.display_name}</p>
                      <p className="text-xs text-slate-500 truncate">{account.address}</p>
                    </div>
                    {account.id === selectedAccountId && (
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                    )}
                  </button>
                ))}
                <div className="border-t border-slate-100">
                  <button
                    onClick={() => { handleViewChange('settings'); setAccountMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add account
                  </button>
                  <button
                    onClick={signOut}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

function AccountAvatar({
  account,
  size = 'md',
}: {
  account?: EmailAccount;
  size?: 'sm' | 'md';
}) {
  const label = account?.display_name || account?.address || '?';
  const color = getAvatarColor(account?.address ?? 'default');
  const initials = getInitials(label);
  const sz = size === 'sm' ? 'w-6 h-6 text-[10px]' : 'w-8 h-8 text-xs';
  return (
    <div
      className={`${sz} rounded-full flex items-center justify-center font-bold text-white flex-shrink-0`}
      style={{ backgroundColor: color }}
    >
      {initials}
    </div>
  );
}
