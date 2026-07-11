import Sidebar from './components/layout/Sidebar';
import EmailList from './components/email/EmailList';
import EmailDetail from './components/email/EmailDetail';
import ComposeModal from './components/compose/ComposeModal';
import SettingsPanel from './components/settings/SettingsPanel';
import ContactsPage from './components/contacts/ContactsPage';
import { useEmail } from './contexts/EmailContext';

export default function MailApp() {
  const { composeOpen, activeView, selectedEmail, sidebarOpen, setSidebarOpen } = useEmail();

  return (
    <div className="h-screen flex overflow-hidden bg-white">
      {/* Mobile sidebar overlay backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — always visible on desktop, drawer on mobile */}
      <div
        className={`
          fixed inset-y-0 left-0 z-40 transition-transform duration-300 md:static md:translate-x-0 md:z-auto
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <Sidebar />
      </div>

      <main className="flex-1 flex overflow-hidden min-w-0">
        {activeView === 'mail' && (
          <>
            {/* Email list — hidden on mobile when email is open */}
            <div className={`
              flex-shrink-0 md:block
              ${selectedEmail ? 'hidden md:block' : 'flex-1 md:flex-none'}
            `}>
              <EmailList />
            </div>

            {/* Email detail — hidden on mobile when no email selected */}
            <div className={`
              flex-1 overflow-hidden
              ${selectedEmail ? 'block' : 'hidden md:block'}
            `}>
              <EmailDetail />
            </div>
          </>
        )}
        {activeView === 'contacts' && <ContactsPage />}
        {activeView === 'settings' && <SettingsPanel />}
      </main>

      {composeOpen && <ComposeModal />}
    </div>
  );
}
