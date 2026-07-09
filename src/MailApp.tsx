import Sidebar from './components/layout/Sidebar';
import EmailList from './components/email/EmailList';
import EmailDetail from './components/email/EmailDetail';
import ComposeModal from './components/compose/ComposeModal';
import SettingsPanel from './components/settings/SettingsPanel';
import ContactsPage from './components/contacts/ContactsPage';
import { useEmail } from './contexts/EmailContext';

export default function MailApp() {
  const { composeOpen, activeView } = useEmail();

  return (
    <div className="h-screen flex overflow-hidden bg-white">
      <Sidebar />

      <main className="flex-1 flex overflow-hidden">
        {activeView === 'mail' && (
          <>
            <EmailList />
            <EmailDetail />
          </>
        )}
        {activeView === 'contacts' && <ContactsPage />}
        {activeView === 'settings' && <SettingsPanel />}
      </main>

      {composeOpen && <ComposeModal />}
    </div>
  );
}
