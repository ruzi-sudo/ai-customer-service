'use client';

import { useState, useSyncExternalStore, createContext, useContext } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bot, LayoutDashboard, MessageSquare, BarChart3, Settings, LogOut, MessageCircle, PanelLeftClose, PanelLeft, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarContextType {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
}

export const SidebarContext = createContext<SidebarContextType>({
  collapsed: false,
  setCollapsed: () => {},
  mobileOpen: false,
  setMobileOpen: () => {},
});

export function useSidebar() {
  return useContext(SidebarContext);
}

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
  const { collapsed, setCollapsed, mobileOpen, setMobileOpen } = useSidebar();

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

  const handleNavClick = () => {
    setMobileOpen(false);
  };

  const sidebarContent = (
    <aside
      className={cn(
        'flex h-full flex-col border-r bg-zinc-50 dark:bg-zinc-900 transition-all duration-200',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className={cn('flex items-center border-b h-14', collapsed ? 'justify-center px-2' : 'gap-2 px-4')}>
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600">
          <Bot className="size-4 text-white" />
        </div>
        {!collapsed && <span className="text-sm font-semibold">AI 客服管理</span>}
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
              onClick={handleNavClick}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                collapsed && 'justify-center px-0',
                active
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'
              )}
            >
              <Icon className="size-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
              {!collapsed && item.href === '/admin/conversations' && waitingCount > 0 && (
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
        {/* Collapse toggle (desktop only) */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        >
          {collapsed ? (
            <PanelLeft className="size-4 shrink-0" />
          ) : (
            <PanelLeftClose className="size-4 shrink-0" />
          )}
          {!collapsed && <span>收起侧栏</span>}
        </button>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className={cn(
            'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100',
            collapsed && 'justify-center px-0'
          )}
        >
          <LogOut className="size-4 shrink-0" />
          {!collapsed && <span>退出登录</span>}
        </button>
        <Link
          href="/"
          onClick={handleNavClick}
          className={cn(
            'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100',
            collapsed && 'justify-center px-0'
          )}
        >
          <MessageCircle className="size-4 shrink-0" />
          {!collapsed && <span>返回首页</span>}
        </Link>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:block h-screen">{sidebarContent}</div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-60">
            <aside className="flex h-full flex-col border-r bg-zinc-50 dark:bg-zinc-900">
              {/* Logo + close */}
              <div className="flex items-center justify-between border-b px-4 h-14">
                <div className="flex items-center gap-2">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600">
                    <Bot className="size-4 text-white" />
                  </div>
                  <span className="text-sm font-semibold">AI 客服管理</span>
                </div>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
                >
                  <X className="size-4" />
                </button>
              </div>

              <nav className="flex-1 space-y-1 px-2 py-3">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={handleNavClick}
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
                  onClick={handleNavClick}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                >
                  <MessageCircle className="size-4" />
                  <span>返回首页</span>
                </Link>
              </div>
            </aside>
          </div>
        </div>
      )}
    </>
  );
}

export function MobileMenuButton() {
  const { setMobileOpen } = useSidebar();
  return (
    <button
      onClick={() => setMobileOpen(true)}
      className="lg:hidden rounded-md p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700"
    >
      <Menu className="size-5" />
    </button>
  );
}
