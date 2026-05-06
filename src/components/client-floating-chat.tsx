'use client';

import dynamic from 'next/dynamic';

const FloatingChat = dynamic(
  () => import('@/components/floating-chat').then(mod => ({ default: mod.FloatingChat })),
  { ssr: false },
);

export function ClientFloatingChat() {
  return <FloatingChat />;
}
