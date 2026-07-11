import { useEffect } from 'react';

function isTypingTarget(el: Element | null): boolean {
  if (!el) return false;
  const tag = (el as HTMLElement).tagName?.toLowerCase();
  const ce = (el as HTMLElement).contentEditable;
  return tag === 'input' || tag === 'textarea' || tag === 'select' || ce === 'true';
}

interface ShortcutCallbacks {
  onNextEmail?: () => void;
  onPrevEmail?: () => void;
  onReply?: () => void;
  onCompose?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
  onStar?: () => void;
  onFocusSearch?: () => void;
  onShowHelp?: () => void;
  onEscape?: () => void;
}

export function useKeyboardShortcuts(cbs: ShortcutCallbacks) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isTypingTarget(document.activeElement)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      switch (e.key) {
        case 'j':
        case 'ArrowDown':
          e.preventDefault();
          cbs.onNextEmail?.();
          break;
        case 'k':
        case 'ArrowUp':
          e.preventDefault();
          cbs.onPrevEmail?.();
          break;
        case 'r':
          cbs.onReply?.();
          break;
        case 'c':
          cbs.onCompose?.();
          break;
        case 'e':
          cbs.onArchive?.();
          break;
        case '#':
        case 'Delete':
          cbs.onDelete?.();
          break;
        case 's':
          cbs.onStar?.();
          break;
        case '/':
          e.preventDefault();
          cbs.onFocusSearch?.();
          break;
        case '?':
          cbs.onShowHelp?.();
          break;
        case 'Escape':
          cbs.onEscape?.();
          break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [cbs]);
}
