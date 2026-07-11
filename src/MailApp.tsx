import { useState, useCallback } from 'react';
import Sidebar from './components/layout/Sidebar';
import EmailList from './components/email/EmailList';
import EmailDetail from './components/email/EmailDetail';
import ComposeModal from './components/compose/ComposeModal';
import SettingsPanel from './components/settings/SettingsPanel';
import ContactsPage from './components/contacts/ContactsPage';
import KeyboardShortcutsModal from './components/shared/KeyboardShortcutsModal';
import { useEmail } from './contexts/EmailContext';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

export default function MailApp() {
  const {
    composeOpen,
    activeView,
    selectedEmail,
    sidebarOpen,
    setSidebarOpen,
    emails,
    setSelectedEmail,
    toggleStar,
    moveToFolder,
    deleteEmail,
    openCompose,
    selectedAccountId,
    setSearchQuery,
    closeCompose,
  } = useEmail();

  const [showShortcuts, setShowShortcuts] = useState(false);

  const currentIndex = emails.findIndex((e) => e.id === selectedEmail?.id);

  useKeyboardShortcuts({
    onNextEmail: useCallback(() => {
      if (emails.length === 0) return;
      const next = currentIndex < emails.length - 1 ? emails[currentIndex + 1] : emails[0];
      setSelectedEmail(next);
    }, [emails, currentIndex, setSelectedEmail]),

    onPrevEmail: useCallback(() => {
      if (emails.length === 0) return;
      const prev = currentIndex > 0 ? emails[currentIndex - 1] : emails[emails.length - 1];
      setSelectedEmail(prev);
    }, [emails, currentIndex, setSelectedEmail]),

    onReply: useCallback(() => {
      if (!selectedEmail || !selectedAccountId) return;
      openCompose({
        fromAccountId: selectedAccountId,
        to: [{ name: selectedEmail.from_name, email: selectedEmail.from_address }],
        subject: selectedEmail.subject.startsWith('Re: ') ? selectedEmail.subject : `Re: ${selectedEmail.subject}`,
        replyToEmailId: selectedEmail.id,
        inReplyTo: selectedEmail.external_message_id,
      });
    }, [selectedEmail, selectedAccountId, openCompose]),

    onCompose: useCallback(() => {
      openCompose(selectedAccountId ? { fromAccountId: selectedAccountId } : {});
    }, [openCompose, selectedAccountId]),

    onArchive: useCallback(() => {
      if (selectedEmail) moveToFolder(selectedEmail.id, 'archive');
    }, [selectedEmail, moveToFolder]),

    onDelete: useCallback(() => {
      if (selectedEmail) deleteEmail(selectedEmail.id);
    }, [selectedEmail, deleteEmail]),

    onStar: useCallback(() => {
      if (selectedEmail) toggleStar(selectedEmail.id);
    }, [selectedEmail, toggleStar]),

    onFocusSearch: useCallback(() => {
      (document.getElementById('email-search') as HTMLInputElement)?.focus();
    }, []),

    onShowHelp: useCallback(() => setShowShortcuts((v) => !v), []),

    onEscape: useCallback(() => {
      if (showShortcuts) { setShowShortcuts(false); return; }
      if (composeOpen) { closeCompose(); return; }
      if (selectedEmail) { setSelectedEmail(null); return; }
      setSearchQuery('');
    }, [showShortcuts, composeOpen, selectedEmail, setSelectedEmail, closeCompose, setSearchQuery]),
  });

  return (
    <div className="h-screen flex overflow-hidden bg-white dark:bg-gray-800">
      {/* Mobile sidebar overlay backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-40 transition-transform duration-300 md:static md:translate-x-0 md:z-auto ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar />
      </div>

      <main className="flex-1 flex overflow-hidden min-w-0">
        {activeView === 'mail' && (
          <>
            <div className={`flex-shrink-0 md:block ${selectedEmail ? 'hidden md:block' : 'flex-1 md:flex-none'}`}>
              <EmailList />
            </div>
            <div className={`flex-1 overflow-hidden ${selectedEmail ? 'block' : 'hidden md:block'}`}>
              <EmailDetail />
            </div>
          </>
        )}
        {activeView === 'contacts' && <ContactsPage />}
        {activeView === 'settings' && <SettingsPanel />}
      </main>

      {composeOpen && <ComposeModal />}
      {showShortcuts && <KeyboardShortcutsModal onClose={() => setShowShortcuts(false)} />}
    </div>
  );
}
