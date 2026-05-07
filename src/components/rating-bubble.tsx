'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RatingBubbleProps {
  compact?: boolean;
  onSubmit: (rating: number) => void;
}

export function RatingBubble({ compact, onSubmit }: RatingBubbleProps) {
  const [hovered, setHovered] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [rating, setRating] = useState(0);

  const handleClick = (star: number) => {
    if (submitted) return;
    setRating(star);
    setSubmitted(true);
    onSubmit(star);
  };

  if (submitted) {
    return (
      <div className={cn(
        'flex flex-col items-center gap-1 rounded-xl bg-emerald-50 dark:bg-emerald-900/30',
        compact ? 'px-3 py-2' : 'px-4 py-3'
      )}>
        <p className={cn('text-emerald-600 dark:text-emerald-400', compact ? 'text-xs' : 'text-sm')}>
          感谢您的评分！
        </p>
        <div className="flex gap-0.5">
          {Array.from({ length: 5 }, (_, i) => (
            <Star
              key={i}
              className={cn(
                compact ? 'size-3.5' : 'size-4',
                i < rating
                  ? 'fill-emerald-500 text-emerald-500'
                  : 'fill-zinc-200 text-zinc-200 dark:fill-zinc-600 dark:text-zinc-600'
              )}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      'flex flex-col items-center gap-2 rounded-xl',
      'bg-white dark:bg-zinc-900',
      'border border-zinc-200 dark:border-zinc-700',
      'shadow-sm',
      compact ? 'px-3 py-2.5' : 'px-4 py-3'
    )}>
      <p className={cn('text-zinc-600 dark:text-zinc-400', compact ? 'text-xs' : 'text-sm')}>
        请为本次服务评分
      </p>
      <div className="flex gap-1">
        {Array.from({ length: 5 }, (_, i) => {
          const star = i + 1;
          return (
            <button
              key={i}
              onClick={() => handleClick(star)}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              className="transition-transform hover:scale-110 focus:outline-none"
            >
              <Star
                className={cn(
                  compact ? 'size-5' : 'size-6',
                  (hovered || rating) >= star
                    ? 'fill-amber-400 text-amber-400'
                    : 'fill-zinc-200 text-zinc-200 dark:fill-zinc-600 dark:text-zinc-600'
                )}
              />
            </button>
          );
        })}
      </div>
      <p className={cn('text-zinc-400', compact ? 'text-[10px]' : 'text-xs')}>
        点击星星评分
      </p>
    </div>
  );
}
