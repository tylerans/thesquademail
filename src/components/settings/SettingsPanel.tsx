import { useState } from 'react';
import { X, Globe, User, Bell } from 'lucide-react';
import DomainsSettings from './DomainsSettings';
import ProfileSettings from './ProfileSettings';

type Tab = 'domains' | 'profile';

const TABS: { id: Tab; label: string; icon: typeof Globe }[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'domains', label: 'Domains', icon: Globe },
];

export default function SettingsPanel() {
  const [activeTab, setActiveTab] = useState<Tab>('profile');

  return (
    <div className="flex h-full bg-white">
      {/* Settings sidebar */}
      <div className="w-56 flex-shrink-0 bg-slate-50 border-r border-slate-200 py-6 px-3">
        <h2 className="text-sm font-bold text-slate-900 px-3 mb-4">Settings</h2>
        <nav className="space-y-0.5">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${
                activeTab === id
                  ? 'bg-blue-100 text-blue-700 font-semibold'
                  : 'text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Settings content */}
      <div className="flex-1 overflow-y-auto py-8 px-8 max-w-2xl">
        {activeTab === 'profile' && <ProfileSettings />}
        {activeTab === 'domains' && <DomainsSettings />}
      </div>
    </div>
  );
}
