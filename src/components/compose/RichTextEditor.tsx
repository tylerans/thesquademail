import { useRef, useEffect, useCallback } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Link,
  Eraser,
} from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

export default function RichTextEditor({ value, onChange, placeholder = 'Compose your message...', minHeight = 180 }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastValue = useRef('');

  useEffect(() => {
    if (!editorRef.current) return;
    if (value !== lastValue.current && value !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value;
      lastValue.current = value;
    }
  }, [value]);

  const exec = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    if (editorRef.current) {
      lastValue.current = editorRef.current.innerHTML;
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const handleInput = () => {
    if (editorRef.current) {
      lastValue.current = editorRef.current.innerHTML;
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleLink = () => {
    const url = prompt('Enter URL:', 'https://');
    if (url) exec('createLink', url);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'b' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); exec('bold'); }
    if (e.key === 'i' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); exec('italic'); }
    if (e.key === 'u' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); exec('underline'); }
  };

  const tools = [
    { icon: Bold, cmd: 'bold', title: 'Bold (Ctrl+B)' },
    { icon: Italic, cmd: 'italic', title: 'Italic (Ctrl+I)' },
    { icon: Underline, cmd: 'underline', title: 'Underline (Ctrl+U)' },
    { icon: Strikethrough, cmd: 'strikeThrough', title: 'Strikethrough' },
  ];

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-3 py-1.5 border-b border-slate-100 dark:border-gray-700 flex-shrink-0 flex-wrap">
        {tools.map(({ icon: Icon, cmd, title }) => (
          <button
            key={cmd}
            type="button"
            onMouseDown={(e) => { e.preventDefault(); exec(cmd); }}
            title={title}
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-gray-700 text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200 transition-all"
          >
            <Icon className="w-3.5 h-3.5" />
          </button>
        ))}
        <div className="w-px h-4 bg-slate-200 dark:bg-gray-700 mx-1" />
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); exec('insertUnorderedList'); }}
          title="Bullet list"
          className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-gray-700 text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200 transition-all"
        >
          <List className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); exec('insertOrderedList'); }}
          title="Numbered list"
          className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-gray-700 text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200 transition-all"
        >
          <ListOrdered className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); exec('formatBlock', '<blockquote>'); }}
          title="Quote"
          className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-gray-700 text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200 transition-all"
        >
          <Quote className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); handleLink(); }}
          title="Insert link"
          className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-gray-700 text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200 transition-all"
        >
          <Link className="w-3.5 h-3.5" />
        </button>
        <div className="w-px h-4 bg-slate-200 dark:bg-gray-700 mx-1" />
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); exec('removeFormat'); }}
          title="Clear formatting"
          className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-gray-700 text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200 transition-all"
        >
          <Eraser className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Editor area */}
      <div className="relative flex-1 overflow-y-auto">
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          className="w-full h-full p-4 text-sm text-slate-900 dark:text-gray-100 focus:outline-none bg-transparent prose prose-sm max-w-none [&_blockquote]:border-l-4 [&_blockquote]:border-slate-300 [&_blockquote]:pl-3 [&_blockquote]:text-slate-500 [&_blockquote]:dark:border-gray-600 [&_blockquote]:dark:text-gray-400 [&_a]:text-blue-600 [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4"
          style={{ minHeight }}
        />
        {!value && (
          <p className="absolute top-4 left-4 text-sm text-slate-400 dark:text-gray-500 pointer-events-none select-none">
            {placeholder}
          </p>
        )}
      </div>
    </div>
  );
}
