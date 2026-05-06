'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Bot, User, Headset, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageBubbleProps {
  message: {
    id: string;
    role: 'user' | 'assistant' | 'agent' | 'system';
    content: string;
    createdAt: string | number | Date;
  };
  compact?: boolean;
}

function formatTime(date: string | number | Date): string {
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  } catch {
    return '';
  }
}

export function MessageBubble({ message, compact = false }: MessageBubbleProps) {
  const { role, content, createdAt } = message;
  const time = formatTime(createdAt);

  // System messages: centered, no avatar, italic
  if (role === 'system') {
    return (
      <div className={cn('flex flex-col items-center gap-1 my-2', compact && 'my-1')}>
        <div
          className={cn(
            'flex items-center gap-1.5 text-zinc-400 italic',
            compact ? 'text-xs' : 'text-sm'
          )}
        >
          <Info className={cn(compact ? 'size-3' : 'size-4')} />
          <span>{content}</span>
        </div>
        <span className={cn('text-zinc-400', compact ? 'text-[10px]' : 'text-xs')}>
          {time}
        </span>
      </div>
    );
  }

  const isUser = role === 'user';

  const avatarConfig = {
    user: { icon: User, bg: 'bg-zinc-700', fallback: 'U' },
    assistant: { icon: Bot, bg: 'bg-emerald-600', fallback: 'AI' },
    agent: { icon: Headset, bg: 'bg-blue-600', fallback: '客服' },
  };

  const config = avatarConfig[role];
  const IconComponent = config.icon;

  const bubbleStyles = {
    user: 'bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900',
    assistant: 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100',
    agent: 'bg-blue-600 text-white',
  };

  return (
    <div
      className={cn(
        'flex gap-2',
        isUser ? 'flex-row-reverse' : 'flex-row',
        compact ? 'my-1' : 'my-3'
      )}
    >
      <Avatar
        size={compact ? 'sm' : 'default'}
        className={cn(config.bg, 'text-white shrink-0')}
      >
        <AvatarFallback className={cn(config.bg, 'text-white')}>
          <IconComponent className={compact ? 'size-3' : 'size-4'} />
        </AvatarFallback>
      </Avatar>

      <div
        className={cn(
          'flex flex-col',
          isUser ? 'items-end' : 'items-start',
          'max-w-[75%]'
        )}
      >
        <div
          className={cn(
            'rounded-2xl',
            isUser ? 'rounded-br-md' : 'rounded-bl-md',
            bubbleStyles[role],
            compact ? 'px-2.5 py-1.5 text-xs' : 'px-3.5 py-2.5 text-sm',
            'whitespace-pre-wrap break-words leading-relaxed'
          )}
        >
          {content}
        </div>
        <span
          className={cn(
            'text-zinc-400 mt-1',
            compact ? 'text-[10px]' : 'text-xs',
            isUser ? 'mr-1' : 'ml-1'
          )}
        >
          {time}
        </span>
      </div>
    </div>
  );
}
