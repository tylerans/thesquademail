import { useState } from 'react';
import {
  Search,
  UserPlus,
  Edit2,
  Trash2,
  X,
  Check,
  Loader2,
  Users,
} from 'lucide-react';
import { useEmail } from '../../contexts/EmailContext';
import { useAuth } from '../../contexts/AuthContext';
import { Contact } from '../../lib/types';
import { supabase } from '../../lib/supabase';
import { getInitials, getAvatarColor } from '../../lib/utils';

export default function ContactsPage() {
  const { contacts, reloadContacts, openCompose, accounts } = useEmail();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [addingNew, setAddingNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [addError, setAddError] = useState<string | null>(null);

  const filtered = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (contact: Contact) => {
    setEditingId(contact.id);
    setEditName(contact.name);
    setEditEmail(contact.email);
  };

  const handleSaveEdit = async (id: string) => {
    setSaving(true);
    await supabase
      .from('contacts')
      .update({ name: editName, email: editEmail })
      .eq('id', id);
    await reloadContacts();
    setSaving(false);
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this contact?')) return;
    await supabase.from('contacts').delete().eq('id', id);
    await reloadContacts();
  };

  const handleAddNew = async () => {
    setAddError(null);
    if (!newEmail.trim()) {
      setAddError('Email is required');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail.trim())) {
      setAddError('Invalid email address');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('contacts').insert({
      name: newName.trim() || newEmail.trim(),
      email: newEmail.trim().toLowerCase(),
    });
    setSaving(false);
    if (error) {
      setAddError(error.message);
    } else {
      setAddingNew(false);
      setNewName('');
      setNewEmail('');
      await reloadContacts();
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-gray-800 overflow-hidden">
      {/* Header */}
      <div className="px-8 py-6 border-b border-slate-100 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-gray-100">Contacts</h2>
            <p className="text-sm text-slate-400 dark:text-gray-500 mt-0.5">{contacts.length} contacts</p>
          </div>
          <button
            onClick={() => { setAddingNew(true); setAddError(null); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            Add Contact
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contacts..."
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-100 dark:bg-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-gray-600 transition-all border border-transparent focus:border-slate-200 dark:focus:border-gray-600 text-slate-900 dark:text-gray-100 placeholder:text-slate-400 dark:placeholder:text-gray-500"
          />
        </div>
      </div>

      {/* Add new contact form */}
      {addingNew && (
        <div className="px-8 py-4 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800">
          <p className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-3">New Contact</p>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Full name"
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-slate-900 dark:text-gray-100 placeholder:text-slate-400 dark:placeholder:text-gray-500"
            />
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="email@example.com"
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-slate-900 dark:text-gray-100 placeholder:text-slate-400 dark:placeholder:text-gray-500"
              onKeyDown={(e) => e.key === 'Enter' && handleAddNew()}
            />
          </div>
          {addError && <p className="text-xs text-red-600 dark:text-red-400 mt-2">{addError}</p>}
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleAddNew}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-all"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Save
            </button>
            <button
              onClick={() => setAddingNew(false)}
              className="px-4 py-1.5 rounded-lg border border-slate-200 dark:border-gray-600 text-sm font-medium text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-700 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Contact list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400 dark:text-gray-500">
            <Users className="w-12 h-12 mb-3 opacity-20" />
            <p className="text-sm font-medium text-slate-500 dark:text-gray-400">
              {search ? 'No contacts found' : 'No contacts yet'}
            </p>
            <p className="text-xs mt-1">
              {search ? 'Try a different search' : 'Contacts are auto-added when you receive email'}
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 dark:border-gray-700">
                <th className="text-left px-8 py-3 text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider">
                  Name
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-4 py-3 w-32" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-gray-700/50">
              {filtered.map((contact) => {
                const isEditing = editingId === contact.id;
                const color = getAvatarColor(contact.email);
                const initials = getInitials(contact.name || contact.email);

                return (
                  <tr key={contact.id} className="hover:bg-slate-50 dark:hover:bg-gray-700/30 transition-colors group">
                    <td className="px-8 py-3">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="px-2 py-1 rounded border border-slate-200 dark:border-gray-600 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 w-full bg-white dark:bg-gray-700 text-slate-900 dark:text-gray-100"
                        />
                      ) : (
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                            style={{ backgroundColor: color }}
                          >
                            {initials}
                          </div>
                          <span className="text-sm font-medium text-slate-800 dark:text-gray-200">
                            {contact.name || '—'}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <input
                          type="email"
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          className="px-2 py-1 rounded border border-slate-200 dark:border-gray-600 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 w-full bg-white dark:bg-gray-700 text-slate-900 dark:text-gray-100"
                        />
                      ) : (
                        <span className="text-sm text-slate-600 dark:text-gray-400">{contact.email}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => handleSaveEdit(contact.id)}
                            disabled={saving}
                            className="p-1.5 rounded hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 dark:text-green-400 transition-all"
                          >
                            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-gray-700 text-slate-500 dark:text-gray-400 transition-all"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openCompose({ to: [{ name: contact.name, email: contact.email }], fromAccountId: accounts[0]?.id })}
                            className="px-2 py-1 rounded text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 font-medium transition-all"
                          >
                            Email
                          </button>
                          <button
                            onClick={() => handleEdit(contact)}
                            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-gray-700 text-slate-500 dark:text-gray-400 transition-all"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(contact.id)}
                            className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 dark:text-gray-500 hover:text-red-500 transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
