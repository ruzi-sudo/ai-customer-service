'use client';

import { useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bot, LayoutDashboard, MessageSquare, BarChart3, Settings, LogOut, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  waitingCount: number;
}

const navItems = [
  { href: '/admin', label: '仪表盘', icon: LayoutDashboard },
  { href: '/admin/conversations', label: '会话管理', icon: MessageSquare },
  { href: '/admin/analytics', label: '数据分析', icon: BarChart3 },
  { href: '/admin/settings', label: '系统设置', icon: Settings },
];

const emptySubscribe = () => () => {};
function useHydrated() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

export default function Sidebar({ waitingCount }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const hydrated = useHydrated();

  const isActive = (href: string) => {
    if (!hydrated) return false;
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/admin/login');
    } catch {
      // ignore
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <aside className="flex h-screen w-60 flex-col border-r bg-zinc-50 dark:bg-zinc-900">
      {/* Logo */}
      <div className="flex items-center gap-2 border-b px-4 py-4">
        <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-600">
          <Bot className="size-4 text-white" />
        </div>
        <span className="text-sm font-semibold">AI 客服管理</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-2 py-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'
              )}
            >
              <Icon className="size-4" />
              <span>{item.label}</span>
              {item.href === '/admin/conversations' && waitingCount > 0 && (
                <span className="ml-auto flex size-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white">
                  {waitingCount > 99 ? '99+' : waitingCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="border-t px-2 py-3 space-y-1">
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        >
          <LogOut className="size-4" />
          <span>退出登录</span>
        </button>
        <Link
          href="/"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        >
          <MessageCircle className="size-4" />
          <span>返回首页</span>
        </Link>
      </div>
    </aside>
  );
}
