'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar, { SidebarContext, MobileMenuButton } from '@/components/admin/sidebar';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (pathname === '/admin/login') return;
    fetch('/api/auth/me')
      .then(res => {
        if (!res.ok) {
          router.push('/admin/login');
        } else {
          setReady(true);
        }
      })
      .catch(() => router.push('/admin/login'));
  }, [pathname, router]);

  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed, mobileOpen, setMobileOpen }}>
      <div className="flex h-screen bg-white">
        <Sidebar waitingCount={0} />
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Mobile header */}
          <div className="flex items-center gap-3 border-b px-4 h-14 lg:hidden">
            <MobileMenuButton />
            <span className="text-sm font-semibold">AI 客服管理</span>
          </div>
          <main className="flex-1 overflow-auto">
            {ready ? children : (
              <div className="flex items-center justify-center h-full">
                <div className="h-6 w-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </main>
        </div>
      </div>
    </SidebarContext.Provider>
  );
}
