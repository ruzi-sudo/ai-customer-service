'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar from '@/components/admin/sidebar';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  // null = checking, true = authed, false = redirecting
  const [ready, setReady] = useState(false);

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
    <div className="flex h-screen bg-white">
      <Sidebar waitingCount={0} />
      <main className="flex-1 overflow-auto">
        {ready ? children : (
          <div className="flex items-center justify-center h-full">
            <div className="h-6 w-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </main>
    </div>
  );
}
