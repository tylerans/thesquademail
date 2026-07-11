import { X } from 'lucide-react';

const SHORTCUTS = [
  { keys: ['j', '↓'], desc: 'Next email' },
  { keys: ['k', '↑'], desc: 'Previous email' },
  { keys: ['r'], desc: 'Reply to email' },
  { keys: ['c'], desc: 'Compose new email' },
  { keys: ['e'], desc: 'Archive email' },
  { keys: ['#', 'Del'], desc: 'Delete email' },
  { keys: ['s'], desc: 'Star / unstar email' },
  { keys: ['/'], desc: 'Focus search' },
  { keys: ['?'], desc: 'Show this help' },
  { keys: ['Esc'], desc: 'Close / go back' },
];

export default function KeyboardShortcutsModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-gray-700 w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-gray-700">
          <h2 className="text-base font-semibold text-slate-900 dark:text-gray-100">Keyboard Shortcuts</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-700 text-slate-500 dark:text-gray-400 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-2">
          {SHORTCUTS.map(({ keys, desc }) => (
            <div key={desc} className="flex items-center justify-between">
              <span className="text-sm text-slate-600 dark:text-gray-300">{desc}</span>
              <div className="flex items-center gap-1">
                {keys.map((k) => (
                  <kbd
                    key={k}
                    className="px-2 py-0.5 rounded bg-slate-100 dark:bg-gray-700 border border-slate-300 dark:border-gray-600 text-xs font-mono text-slate-700 dark:text-gray-300 shadow-sm"
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="px-5 py-3 bg-slate-50 dark:bg-gray-700 border-t border-slate-100 dark:border-gray-700">
          <p className="text-xs text-slate-400 dark:text-gray-500">Shortcuts are disabled when typing in a field.</p>
        </div>
      </div>
    </div>
  );
}
