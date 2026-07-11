import { Search, RefreshCw, Loader2, InboxIcon, Menu, Archive, Trash2, MailOpen, Mail, X, CheckSquare } from 'lucide-react';
import { useEmail } from '../../contexts/EmailContext';
import EmailListItem from './EmailListItem';

const FOLDER_LABELS: Record<string, string> = {
  inbox: 'Inbox',
  starred: 'Starred',
  sent: 'Sent',
  drafts: 'Drafts',
  archive: 'Archive',
  spam: 'Spam',
  trash: 'Trash',
};

export default function EmailList() {
  const {
    emails,
    emailsLoading,
    currentFolder,
    searchQuery,
    setSearchQuery,
    reloadEmails,
    selectedAccountId,
    accounts,
    unreadCounts,
    setSidebarOpen,
    selectedEmailIds,
    clearEmailSelection,
    selectAllEmails,
    bulkArchive,
    bulkDelete,
    bulkMarkRead,
  } = useEmail();

  const title = searchQuery ? `Search: "${searchQuery}"` : FOLDER_LABELS[currentFolder] ?? 'Inbox';
  const unread = !searchQuery && currentFolder !== 'starred' ? unreadCounts[currentFolder] : undefined;
  const currentAccount = accounts.find((a) => a.id === selectedAccountId);
  const hasSelection = selectedEmailIds.size > 0;
  const allSelected = emails.length > 0 && selectedEmailIds.size === emails.length;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 border-r border-slate-200 dark:border-gray-700 w-full md:w-[360px] md:flex-none">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-slate-100 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-700 text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200 transition-all md:hidden flex-shrink-0"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-slate-900 dark:text-gray-100 flex items-center gap-2">
                {title}
                {unread != null && unread > 0 && (
                  <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-blue-600 text-white">
                    {unread > 99 ? '99+' : unread}
                  </span>
                )}
              </h2>
              {currentAccount && (
                <p className="text-xs text-slate-400 dark:text-gray-600 mt-0.5 truncate">{currentAccount.address}</p>
              )}
            </div>
          </div>
          <button
            onClick={() => reloadEmails()}
            disabled={emailsLoading}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-700 text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300 transition-all disabled:opacity-50 flex-shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${emailsLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-gray-500" />
          <input
            id="email-search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search emails..."
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-100 dark:bg-gray-700 text-sm text-slate-800 dark:text-gray-100 placeholder:text-slate-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-gray-700 transition-all border border-transparent focus:border-slate-200 dark:focus:border-gray-600"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-gray-500 dark:hover:text-gray-300 text-xs font-medium"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Bulk action toolbar */}
      {hasSelection && (
        <div className="flex items-center gap-1 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800">
          <button
            onClick={allSelected ? clearEmailSelection : selectAllEmails}
            className="p-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-800/40 text-blue-700 dark:text-blue-400 transition-all"
            title={allSelected ? 'Deselect all' : 'Select all'}
          >
            <CheckSquare className="w-4 h-4" />
          </button>
          <span className="text-xs font-semibold text-blue-700 dark:text-blue-400 mr-1">
            {selectedEmailIds.size} selected
          </span>
          <div className="flex-1" />
          <button
            onClick={() => bulkMarkRead(true)}
            title="Mark as read"
            className="p-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-800/40 text-blue-600 dark:text-blue-400 transition-all"
          >
            <MailOpen className="w-4 h-4" />
          </button>
          <button
            onClick={() => bulkMarkRead(false)}
            title="Mark as unread"
            className="p-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-800/40 text-blue-600 dark:text-blue-400 transition-all"
          >
            <Mail className="w-4 h-4" />
          </button>
          <button
            onClick={bulkArchive}
            title="Archive"
            className="p-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-800/40 text-blue-600 dark:text-blue-400 transition-all"
          >
            <Archive className="w-4 h-4" />
          </button>
          <button
            onClick={bulkDelete}
            title="Delete"
            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-blue-600 dark:text-blue-400 hover:text-red-600 transition-all"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={clearEmailSelection}
            title="Cancel"
            className="p-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-800/40 text-blue-500 dark:text-blue-500 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Email list */}
      <div className="flex-1 overflow-y-auto">
        {emailsLoading ? (
          <div className="flex items-center justify-center h-32 text-slate-400 dark:text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            <span className="text-sm">Loading...</span>
          </div>
        ) : !selectedAccountId ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400 dark:text-gray-600 px-8 text-center">
            <InboxIcon className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm font-medium text-slate-600 dark:text-gray-400">No email account</p>
            <p className="text-xs text-slate-400 dark:text-gray-600 mt-1">
              Go to Settings to add a custom domain and create your email address.
            </p>
          </div>
        ) : emails.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400 dark:text-gray-600 px-8 text-center">
            <InboxIcon className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm font-medium text-slate-600 dark:text-gray-400">
              {searchQuery ? 'No results found' : `${title} is empty`}
            </p>
            <p className="text-xs mt-1">
              {searchQuery ? 'Try different search terms' : "You're all caught up!"}
            </p>
          </div>
        ) : (
          <div>
            {emails.map((email) => (
              <EmailListItem key={email.id} email={email} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
