'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RootRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    const token = localStorage.getItem('zpz_access_token');
    if (token) {
      router.replace('/dashboard');
    } else {
      router.replace('/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex items-center justify-center font-mono text-sm">
      Initializing Zapuza Factory Operations & Quality Control System...
    </div>
  );
}