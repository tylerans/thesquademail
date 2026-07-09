import { useState, useEffect } from 'react';
import {
  Globe,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronDown,
  ChevronRight,
  Plus,
  Copy,
  Check,
  Loader2,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useEmail } from '../../contexts/EmailContext';
import { Domain, EmailAccount } from '../../lib/types';

export default function DomainsSettings() {
  const { accounts, reloadAccounts } = useEmail();
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingDomain, setAddingDomain] = useState(false);
  const [newDomainName, setNewDomainName] = useState('');
  const [domainError, setDomainError] = useState<string | null>(null);
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);
  const [dnsRecords, setDnsRecords] = useState<Record<string, any[]>>({});
  const [resendDomainIds, setResendDomainIds] = useState<Record<string, string>>({});
  const [verifying, setVerifying] = useState<string | null>(null);
  const [copiedCell, setCopiedCell] = useState<string | null>(null);
  const [addingAccount, setAddingAccount] = useState<string | null>(null);
  const [newAccountLocal, setNewAccountLocal] = useState('');
  const [newAccountName, setNewAccountName] = useState('');
  const [accountError, setAccountError] = useState<string | null>(null);

  useEffect(() => {
    loadDomains();
  }, []);

  const loadDomains = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('domains')
      .select('*')
      .order('created_at');
    if (data) setDomains(data as Domain[]);
    setLoading(false);
  };

  const handleAddDomain = async () => {
    const name = newDomainName.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
    if (!name) return;
    if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z]{2,})+$/.test(name)) {
      setDomainError('Please enter a valid domain name (e.g. example.com)');
      return;
    }
    setDomainError(null);
    setAddingDomain(true);

    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-dns-records`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ domain_name: name }),
        }
      );
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to add domain');

      await loadDomains();
      setDnsRecords((prev) => ({ ...prev, [result.domain_id]: result.records }));
      if (result.resend_domain_id) {
        setResendDomainIds((prev) => ({ ...prev, [result.domain_id]: result.resend_domain_id }));
      }
      setExpandedDomain(result.domain_id);
      setNewDomainName('');
    } catch (err: any) {
      setDomainError(err.message);
    } finally {
      setAddingDomain(false);
    }
  };

  const handleVerify = async (domain: Domain) => {
    setVerifying(domain.id);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-domain`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            domain_id: domain.id,
            resend_domain_id: resendDomainIds[domain.id] || domain.mailgun_domain,
            domain_name: domain.domain_name,
          }),
        }
      );
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Verification failed');
      setDnsRecords((prev) => ({ ...prev, [domain.id]: result.records }));
      await loadDomains();
    } catch (err: any) {
      console.error(err);
    } finally {
      setVerifying(null);
    }
  };

  const handleDeleteDomain = async (domainId: string) => {
    if (!confirm('Delete this domain and all associated email accounts? This cannot be undone.')) return;
    await supabase.from('domains').delete().eq('id', domainId);
    await loadDomains();
    await reloadAccounts();
  };

  const handleCreateAccount = async (domain: Domain) => {
    const address = `${newAccountLocal.trim().toLowerCase()}@${domain.domain_name}`;
    if (!newAccountLocal.trim()) {
      setAccountError('Enter a mailbox name');
      return;
    }
    setAccountError(null);
    try {
      const { error } = await supabase.from('email_accounts').insert({
        domain_id: domain.id,
        address,
        display_name: newAccountName.trim() || newAccountLocal.trim(),
        is_default: accounts.length === 0,
      });
      if (error) throw new Error(error.message);
      setAddingAccount(null);
      setNewAccountLocal('');
      setNewAccountName('');
      await reloadAccounts();
    } catch (err: any) {
      setAccountError(err.message);
    }
  };

  const handleDeleteAccount = async (accountId: string) => {
    if (!confirm('Delete this email address?')) return;
    await supabase.from('email_accounts').delete().eq('id', accountId);
    await reloadAccounts();
  };

  const copyToClipboard = (value: string, key: string) => {
    navigator.clipboard.writeText(value);
    setCopiedCell(key);
    setTimeout(() => setCopiedCell(null), 2000);
  };

  const domainAccounts = (domainId: string) =>
    accounts.filter((a) => a.domain_id === domainId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-slate-900 mb-1">Custom Domains</h3>
        <p className="text-sm text-slate-500">
          Add your domain and configure DNS records to send and receive email from your own addresses.
        </p>
      </div>

      {/* Add domain */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={newDomainName}
            onChange={(e) => setNewDomainName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddDomain()}
            placeholder="yourdomain.com"
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <button
          onClick={handleAddDomain}
          disabled={addingDomain || !newDomainName.trim()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {addingDomain ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Add Domain
        </button>
      </div>
      {domainError && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-100">
          {domainError}
        </p>
      )}

      {/* Domain list */}
      {domains.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
          <Globe className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-600">No domains added yet</p>
          <p className="text-xs text-slate-400 mt-1">
            Add your domain above to get started with custom email addresses.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {domains.map((domain) => (
            <DomainCard
              key={domain.id}
              domain={domain}
              accounts={domainAccounts(domain.id)}
              records={dnsRecords[domain.id]}
              expanded={expandedDomain === domain.id}
              verifying={verifying === domain.id}
              copiedCell={copiedCell}
              addingAccount={addingAccount === domain.id}
              newAccountLocal={newAccountLocal}
              newAccountName={newAccountName}
              accountError={accountError}
              onToggleExpand={() =>
                setExpandedDomain((v) => (v === domain.id ? null : domain.id))
              }
              onVerify={() => handleVerify(domain)}
              onDelete={() => handleDeleteDomain(domain.id)}
              onCopy={copyToClipboard}
              onStartAddAccount={() => {
                setAddingAccount(domain.id);
                setNewAccountLocal('');
                setNewAccountName('');
                setAccountError(null);
              }}
              onCancelAddAccount={() => setAddingAccount(null)}
              onCreateAccount={() => handleCreateAccount(domain)}
              onDeleteAccount={handleDeleteAccount}
              onNewAccountLocalChange={setNewAccountLocal}
              onNewAccountNameChange={setNewAccountName}
            />
          ))}
        </div>
      )}

      {/* Setup instructions */}
      <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 text-sm">
        <p className="font-semibold text-blue-800 mb-2">How to set up custom domain email</p>
        <ol className="space-y-1 text-blue-700 text-xs list-decimal list-inside">
          <li>Create a <strong>free</strong> account at <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="underline font-medium">resend.com</a> (3,000 emails/month free, no credit card)</li>
          <li>Copy your API key from the Resend dashboard</li>
          <li>Add it as a secret named <code className="bg-blue-100 px-1 rounded font-mono">RESEND_API_KEY</code> in Supabase Edge Function settings</li>
          <li>Add your domain above — DNS records are generated automatically</li>
          <li>Add all DNS records at your domain registrar (SPF, DKIM, and the inbound MX record)</li>
          <li>Click "Verify DNS" once propagated (can take up to 48 hours)</li>
          <li>Create a mailbox on your verified domain and start sending and receiving</li>
        </ol>
      </div>
    </div>
  );
}

function DomainCard({
  domain,
  accounts,
  records,
  expanded,
  verifying,
  copiedCell,
  addingAccount,
  newAccountLocal,
  newAccountName,
  accountError,
  onToggleExpand,
  onVerify,
  onDelete,
  onCopy,
  onStartAddAccount,
  onCancelAddAccount,
  onCreateAccount,
  onDeleteAccount,
  onNewAccountLocalChange,
  onNewAccountNameChange,
}: {
  domain: Domain;
  accounts: EmailAccount[];
  records?: any[];
  expanded: boolean;
  verifying: boolean;
  copiedCell: string | null;
  addingAccount: boolean;
  newAccountLocal: string;
  newAccountName: string;
  accountError: string | null;
  onToggleExpand: () => void;
  onVerify: () => void;
  onDelete: () => void;
  onCopy: (value: string, key: string) => void;
  onStartAddAccount: () => void;
  onCancelAddAccount: () => void;
  onCreateAccount: () => void;
  onDeleteAccount: (id: string) => void;
  onNewAccountLocalChange: (v: string) => void;
  onNewAccountNameChange: (v: string) => void;
}) {
  const StatusIcon =
    domain.status === 'verified'
      ? CheckCircle2
      : domain.status === 'failed'
      ? XCircle
      : Clock;
  const statusColor =
    domain.status === 'verified'
      ? 'text-green-600'
      : domain.status === 'failed'
      ? 'text-red-500'
      : 'text-yellow-500';
  const statusBg =
    domain.status === 'verified'
      ? 'bg-green-50 border-green-200'
      : domain.status === 'failed'
      ? 'bg-red-50 border-red-200'
      : 'bg-yellow-50 border-yellow-200';

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      {/* Domain header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors">
        <button onClick={onToggleExpand} className="flex-1 flex items-center gap-3 min-w-0 text-left">
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
          )}
          <Globe className="w-4 h-4 text-slate-500 flex-shrink-0" />
          <span className="text-sm font-semibold text-slate-900">{domain.domain_name}</span>
          <span
            className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${statusBg} ${statusColor}`}
          >
            <StatusIcon className="w-3 h-3" />
            {domain.status === 'verified' ? 'Verified' : domain.status === 'failed' ? 'Failed' : 'Pending DNS'}
          </span>
          <span className="text-xs text-slate-400">
            {accounts.length} mailbox{accounts.length !== 1 ? 'es' : ''}
          </span>
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={onVerify}
            disabled={verifying}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600 transition-all disabled:opacity-50"
          >
            {verifying ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            Verify DNS
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 py-4 space-y-5 border-t border-slate-100">
          {/* DNS Records */}
          {records && records.length > 0 ? (
            <div>
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                DNS Records to Add
              </p>
              <div className="rounded-lg border border-slate-200 overflow-hidden text-xs">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left px-3 py-2 text-slate-500 font-medium w-16">Type</th>
                      <th className="text-left px-3 py-2 text-slate-500 font-medium w-1/3">Host</th>
                      <th className="text-left px-3 py-2 text-slate-500 font-medium">Value</th>
                      <th className="px-3 py-2 text-slate-500 font-medium w-16 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {records.map((rec, i) => {
                      const copyKey = `${domain.id}-${i}`;
                      return (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="px-3 py-2">
                            <span className="font-mono font-bold text-slate-700">{rec.type}</span>
                          </td>
                          <td className="px-3 py-2">
                            <span className="font-mono text-slate-700 break-all">{rec.host}</span>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-start gap-1">
                              <span className="font-mono text-slate-700 break-all flex-1">{rec.value}</span>
                              <button
                                onClick={() => onCopy(rec.value, copyKey)}
                                className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600 flex-shrink-0 transition-all"
                              >
                                {copiedCell === copyKey ? (
                                  <Check className="w-3 h-3 text-green-500" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-center">
                            {rec.valid ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mx-auto" />
                            ) : (
                              <Clock className="w-3.5 h-3.5 text-yellow-500 mx-auto" />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-slate-400 mt-1.5">
                After adding these records, DNS propagation can take up to 48 hours.
              </p>
            </div>
          ) : (
            <div className="text-xs text-slate-500 bg-slate-50 rounded-lg px-4 py-3">
              Click "Verify DNS" to load the DNS records for this domain, or re-add the domain if records are missing.
            </div>
          )}

          {/* Mailboxes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Mailboxes
              </p>
              {!addingAccount && (
                <button
                  onClick={onStartAddAccount}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  <Plus className="w-3.5 h-3.5" /> Add mailbox
                </button>
              )}
            </div>

            {accounts.length === 0 && !addingAccount && (
              <p className="text-xs text-slate-400 italic">No mailboxes yet.</p>
            )}

            <div className="space-y-1.5">
              {accounts.map((acc) => (
                <div
                  key={acc.id}
                  className="flex items-center justify-between px-3 py-2 bg-white border border-slate-200 rounded-lg"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-800">{acc.address}</p>
                    <p className="text-xs text-slate-400">{acc.display_name}</p>
                  </div>
                  <button
                    onClick={() => onDeleteAccount(acc.id)}
                    className="p-1 text-slate-400 hover:text-red-500 rounded hover:bg-red-50 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {addingAccount && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newAccountLocal}
                      onChange={(e) => onNewAccountLocalChange(e.target.value.toLowerCase().replace(/[^a-z0-9._+-]/g, ''))}
                      placeholder="hello"
                      className="flex-1 px-2.5 py-1.5 rounded border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <span className="text-sm text-slate-600 font-medium">@{domain.domain_name}</span>
                  </div>
                  <input
                    type="text"
                    value={newAccountName}
                    onChange={(e) => onNewAccountNameChange(e.target.value)}
                    placeholder="Display name (e.g. Support Team)"
                    className="w-full px-2.5 py-1.5 rounded border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  {accountError && (
                    <p className="text-xs text-red-600">{accountError}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={onCreateAccount}
                      className="px-3 py-1.5 rounded bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-all"
                    >
                      Create
                    </button>
                    <button
                      onClick={onCancelAddAccount}
                      className="px-3 py-1.5 rounded bg-white border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
