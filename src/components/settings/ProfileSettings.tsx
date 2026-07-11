import { useState } from 'react';
import { Save, Loader2, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useEmail } from '../../contexts/EmailContext';
import { useAuth } from '../../contexts/AuthContext';
import { EmailAccount } from '../../lib/types';

export default function ProfileSettings() {
  const { user } = useAuth();
  const { accounts, reloadAccounts } = useEmail();
  const [editingAccount, setEditingAccount] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [signature, setSignature] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const startEdit = (account: EmailAccount) => {
    setEditingAccount(account.id);
    setDisplayName(account.display_name);
    setSignature(account.signature || '');
    setSaved(false);
  };

  const handleSave = async () => {
    if (!editingAccount) return;
    setSaving(true);
    const { error } = await supabase
      .from('email_accounts')
      .update({ display_name: displayName, signature })
      .eq('id', editingAccount);
    setSaving(false);
    if (!error) {
      setSaved(true);
      await reloadAccounts();
      setTimeout(() => setSaved(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-slate-900 dark:text-gray-100 mb-1">Profile & Signature</h3>
        <p className="text-sm text-slate-500 dark:text-gray-400">
          Customize the display name and signature for each email account.
        </p>
      </div>

      <div className="p-3 bg-slate-50 dark:bg-gray-700 rounded-lg border border-slate-200 dark:border-gray-600 text-sm">
        <p className="text-slate-600 dark:text-gray-300">
          Logged in as <span className="font-medium text-slate-900 dark:text-gray-100">{user?.email}</span>
        </p>
      </div>

      {accounts.length === 0 ? (
        <div className="text-center py-10 text-slate-400 dark:text-gray-600 text-sm">
          No email accounts yet. Add a domain first.
        </div>
      ) : (
        <div className="space-y-4">
          {accounts.map((account) => {
            const isEditing = editingAccount === account.id;
            return (
              <div key={account.id} className="border border-slate-200 dark:border-gray-700 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-gray-700">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-gray-100">{account.address}</p>
                    <p className="text-xs text-slate-500 dark:text-gray-400">{account.display_name}</p>
                  </div>
                  {!isEditing && (
                    <button
                      onClick={() => startEdit(account)}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium px-3 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                    >
                      Edit
                    </button>
                  )}
                </div>

                {isEditing && (
                  <div className="px-4 py-4 space-y-4 dark:bg-gray-800">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-gray-300 mb-1.5">
                        Display Name
                      </label>
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Your Name"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-slate-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <p className="text-xs text-slate-400 dark:text-gray-500 mt-1">
                        Shown as the sender name when you send emails.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-gray-300 mb-1.5">
                        Email Signature
                      </label>
                      <textarea
                        value={signature}
                        onChange={(e) => setSignature(e.target.value)}
                        rows={5}
                        placeholder={`--\nYour Name\nYour Title | Company\nphone@example.com`}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-slate-900 dark:text-gray-100 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      />
                      <p className="text-xs text-slate-400 dark:text-gray-500 mt-1">
                        Automatically appended to new messages.
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-all"
                      >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                        {saved ? 'Saved!' : 'Save Changes'}
                      </button>
                      <button
                        onClick={() => setEditingAccount(null)}
                        className="px-4 py-2 rounded-lg border border-slate-200 dark:border-gray-600 text-sm font-medium text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-700 transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
