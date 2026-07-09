import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useEffect,
} from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import {
  Email,
  EmailAccount,
  EmailLabel,
  SidebarFolder,
  ComposeData,
  ActiveView,
  Contact,
} from '../lib/types';

interface EmailContextType {
  // Accounts
  accounts: EmailAccount[];
  selectedAccountId: string | null;
  setSelectedAccountId: (id: string | null) => void;
  reloadAccounts: () => Promise<void>;

  // Navigation
  currentFolder: SidebarFolder;
  setCurrentFolder: (folder: SidebarFolder) => void;
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;

  // Emails
  emails: Email[];
  emailsLoading: boolean;
  selectedEmail: Email | null;
  setSelectedEmail: (email: Email | null) => void;
  reloadEmails: () => Promise<void>;
  markRead: (emailId: string, read: boolean) => Promise<void>;
  toggleStar: (emailId: string) => Promise<void>;
  moveToFolder: (emailId: string, folder: string) => Promise<void>;
  deleteEmail: (emailId: string) => Promise<void>;

  // Unread counts
  unreadCounts: Record<string, number>;

  // Labels
  labels: EmailLabel[];
  reloadLabels: () => Promise<void>;

  // Search
  searchQuery: string;
  setSearchQuery: (q: string) => void;

  // Compose
  composeOpen: boolean;
  composeData: Partial<ComposeData> | null;
  openCompose: (data?: Partial<ComposeData>) => void;
  closeCompose: () => void;

  // Contacts
  contacts: Contact[];
  reloadContacts: () => Promise<void>;
}

const EmailContext = createContext<EmailContextType | null>(null);

export function EmailProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [currentFolder, setCurrentFolder] = useState<SidebarFolder>('inbox');
  const [activeView, setActiveView] = useState<ActiveView>('mail');
  const [emails, setEmails] = useState<Email[]>([]);
  const [emailsLoading, setEmailsLoading] = useState(false);
  const [selectedEmail, setSelectedEmailState] = useState<Email | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [labels, setLabels] = useState<EmailLabel[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeData, setComposeData] = useState<Partial<ComposeData> | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);

  const reloadAccounts = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('email_accounts')
      .select('*, domain:domains(*)')
      .eq('user_id', user.id)
      .order('created_at');
    if (data) {
      setAccounts(data as EmailAccount[]);
      if (data.length > 0 && !selectedAccountId) {
        const defaultAccount = data.find((a) => a.is_default) ?? data[0];
        setSelectedAccountId(defaultAccount.id);
      }
    }
  }, [user, selectedAccountId]);

  const reloadLabels = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('email_labels')
      .select('*')
      .eq('user_id', user.id)
      .order('name');
    if (data) setLabels(data as EmailLabel[]);
  }, [user]);

  const reloadContacts = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('contacts')
      .select('*')
      .eq('user_id', user.id)
      .order('name');
    if (data) setContacts(data as Contact[]);
  }, [user]);

  const reloadUnreadCounts = useCallback(async () => {
    if (!user || !selectedAccountId) return;
    const { data } = await supabase
      .from('emails')
      .select('folder')
      .eq('user_id', user.id)
      .eq('account_id', selectedAccountId)
      .eq('is_read', false)
      .neq('folder', 'trash')
      .neq('folder', 'spam');

    if (data) {
      const counts: Record<string, number> = {};
      for (const row of data) {
        counts[row.folder] = (counts[row.folder] ?? 0) + 1;
      }
      setUnreadCounts(counts);
    }
  }, [user, selectedAccountId]);

  const reloadEmails = useCallback(async () => {
    if (!user || !selectedAccountId) return;
    setEmailsLoading(true);

    let query = supabase
      .from('emails')
      .select('*, attachments:email_attachments(*), labels:email_label_assignments(label:email_labels(*))')
      .eq('user_id', user.id)
      .eq('account_id', selectedAccountId);

    if (searchQuery) {
      query = query.or(`subject.ilike.%${searchQuery}%,body_text.ilike.%${searchQuery}%,from_address.ilike.%${searchQuery}%`);
    } else if (currentFolder === 'starred') {
      query = query.eq('is_starred', true).neq('folder', 'trash');
    } else {
      query = query.eq('folder', currentFolder);
    }

    query = query.order('received_at', { ascending: false }).limit(100);

    const { data } = await query;
    if (data) {
      const normalizedEmails = data.map((e: any) => ({
        ...e,
        to_addresses: e.to_addresses ?? [],
        cc_addresses: e.cc_addresses ?? [],
        bcc_addresses: e.bcc_addresses ?? [],
        labels: (e.labels ?? []).map((la: any) => la.label).filter(Boolean),
      }));
      setEmails(normalizedEmails as Email[]);
    }
    setEmailsLoading(false);
  }, [user, selectedAccountId, currentFolder, searchQuery]);

  const setSelectedEmail = useCallback(
    async (email: Email | null) => {
      setSelectedEmailState(email);
      if (email && !email.is_read) {
        await supabase.from('emails').update({ is_read: true }).eq('id', email.id);
        setEmails((prev) =>
          prev.map((e) => (e.id === email.id ? { ...e, is_read: true } : e))
        );
        reloadUnreadCounts();
      }
    },
    [reloadUnreadCounts]
  );

  const markRead = useCallback(async (emailId: string, read: boolean) => {
    await supabase.from('emails').update({ is_read: read }).eq('id', emailId);
    setEmails((prev) =>
      prev.map((e) => (e.id === emailId ? { ...e, is_read: read } : e))
    );
    reloadUnreadCounts();
  }, [reloadUnreadCounts]);

  const toggleStar = useCallback(async (emailId: string) => {
    const email = emails.find((e) => e.id === emailId);
    if (!email) return;
    const newVal = !email.is_starred;
    await supabase.from('emails').update({ is_starred: newVal }).eq('id', emailId);
    setEmails((prev) =>
      prev.map((e) => (e.id === emailId ? { ...e, is_starred: newVal } : e))
    );
  }, [emails]);

  const moveToFolder = useCallback(
    async (emailId: string, folder: string) => {
      await supabase.from('emails').update({ folder }).eq('id', emailId);
      setEmails((prev) => prev.filter((e) => e.id !== emailId));
      if (selectedEmail?.id === emailId) setSelectedEmailState(null);
      reloadUnreadCounts();
    },
    [selectedEmail, reloadUnreadCounts]
  );

  const deleteEmail = useCallback(
    async (emailId: string) => {
      const email = emails.find((e) => e.id === emailId);
      if (!email) return;
      if (email.folder === 'trash') {
        await supabase.from('emails').delete().eq('id', emailId);
      } else {
        await supabase.from('emails').update({ folder: 'trash' }).eq('id', emailId);
      }
      setEmails((prev) => prev.filter((e) => e.id !== emailId));
      if (selectedEmail?.id === emailId) setSelectedEmailState(null);
      reloadUnreadCounts();
    },
    [emails, selectedEmail, reloadUnreadCounts]
  );

  const openCompose = useCallback((data?: Partial<ComposeData>) => {
    setComposeData(data ?? null);
    setComposeOpen(true);
  }, []);

  const closeCompose = useCallback(() => {
    setComposeOpen(false);
    setComposeData(null);
  }, []);

  useEffect(() => {
    if (user) {
      reloadAccounts();
      reloadLabels();
      reloadContacts();
    }
  }, [user]);

  useEffect(() => {
    if (selectedAccountId) {
      reloadEmails();
      reloadUnreadCounts();
    }
  }, [selectedAccountId, currentFolder, searchQuery]);

  // Realtime subscription for new emails
  useEffect(() => {
    if (!user || !selectedAccountId) return;
    const channel = supabase
      .channel('emails-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'emails', filter: `user_id=eq.${user.id}` },
        () => {
          reloadEmails();
          reloadUnreadCounts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, selectedAccountId, reloadEmails, reloadUnreadCounts]);

  return (
    <EmailContext.Provider
      value={{
        accounts,
        selectedAccountId,
        setSelectedAccountId,
        reloadAccounts,
        currentFolder,
        setCurrentFolder,
        activeView,
        setActiveView,
        emails,
        emailsLoading,
        selectedEmail,
        setSelectedEmail,
        reloadEmails,
        markRead,
        toggleStar,
        moveToFolder,
        deleteEmail,
        unreadCounts,
        labels,
        reloadLabels,
        searchQuery,
        setSearchQuery,
        composeOpen,
        composeData,
        openCompose,
        closeCompose,
        contacts,
        reloadContacts,
      }}
    >
      {children}
    </EmailContext.Provider>
  );
}

export function useEmail() {
  const ctx = useContext(EmailContext);
  if (!ctx) throw new Error('useEmail must be used within EmailProvider');
  return ctx;
}
