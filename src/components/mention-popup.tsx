'use client';

import { useEffect, useRef, useState } from 'react';
import { Headset } from 'lucide-react';
import { cn } from '@/lib/utils';

const MENTIONS = [
  { trigger: '@人工', label: '人工客服', desc: '转接人工客服' },
  { trigger: '@manual', label: 'Human Customer Service', desc: 'Transfer to human agent' },
];

interface MentionPopupProps {
  input: string;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onSelect: (text: string) => void;
  compact?: boolean;
}

export function MentionPopup({ input, textareaRef, onSelect, compact }: MentionPopupProps) {
  const [visible, setVisible] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [filter, setFilter] = useState('');
  const popupRef = useRef<HTMLDivElement>(null);

  // Detect if cursor is right after an @ trigger
  useEffect(() => {
    const cursorPos = textareaRef.current?.selectionStart ?? input.length;
    const textBeforeCursor = input.slice(0, cursorPos);
    const atMatch = textBeforeCursor.match(/@([^\s@]*)$/);
    if (atMatch) {
      setFilter(atMatch[1].toLowerCase());
      setVisible(true);
      setActiveIndex(0);
    } else {
      setVisible(false);
    }
  }, [input, textareaRef]);

  const filtered = MENTIONS.filter(
    (m) =>
      m.trigger.toLowerCase().includes(filter) ||
      m.label.toLowerCase().includes(filter) ||
      m.desc.toLowerCase().includes(filter)
  );

  useEffect(() => {
    if (!visible) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % filtered.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + filtered.length) % filtered.length);
      } else if (e.key === 'Enter' && filtered.length > 0) {
        e.preventDefault();
        applyMention(filtered[activeIndex]);
      } else if (e.key === 'Escape') {
        setVisible(false);
      }
    };
    document.addEventListener('keydown', handleKey, true);
    return () => document.removeEventListener('keydown', handleKey, true);
  }, [visible, filtered, activeIndex]);

  // Close on click outside
  useEffect(() => {
    if (!visible) return;
    const handleClick = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setVisible(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [visible]);

  const applyMention = (mention: typeof MENTIONS[number]) => {
    const cursorPos = textareaRef.current?.selectionStart ?? input.length;
    const textBefore = input.slice(0, cursorPos);
    const textAfter = input.slice(cursorPos);
    const replaced = textBefore.replace(/@([^\s@]*)$/, mention.trigger + ' ');
    onSelect(replaced + textAfter);
    setVisible(false);
    setTimeout(() => {
      const newPos = replaced.length;
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(newPos, newPos);
    }, 0);
  };

  if (!visible || filtered.length === 0) return null;

  return (
    <div
      ref={popupRef}
      className={cn(
        'absolute left-0 right-0 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-800',
        compact ? 'bottom-full mb-1' : 'bottom-full mb-1'
      )}
      style={{ zIndex: 60 }}
    >
      <div className={cn('px-2', compact ? 'py-1' : 'py-1.5')}>
        <p className={cn('text-zinc-400 px-1', compact ? 'text-[10px] mb-0.5' : 'text-[11px] mb-1')}>
          转接人工客服
        </p>
        {filtered.map((m, i) => (
          <button
            key={m.trigger}
            onClick={() => applyMention(m)}
            className={cn(
              'flex w-full items-center gap-2 rounded-md px-2 text-left transition-colors',
              compact ? 'py-1.5' : 'py-2',
              i === activeIndex
                ? 'bg-emerald-50 dark:bg-emerald-900/30'
                : 'hover:bg-zinc-50 dark:hover:bg-zinc-700/50'
            )}
          >
            <div className={cn(
              'flex items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900 shrink-0',
              compact ? 'size-6' : 'size-7'
            )}>
              <Headset className={cn('text-blue-600 dark:text-blue-400', compact ? 'size-3' : 'size-3.5')} />
            </div>
            <div className="min-w-0">
              <p className={cn('font-medium text-zinc-900 dark:text-zinc-100', compact ? 'text-xs' : 'text-sm')}>
                {m.trigger}
              </p>
              <p className={cn('text-zinc-500 truncate', compact ? 'text-[10px]' : 'text-xs')}>
                {m.label} · {m.desc}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
