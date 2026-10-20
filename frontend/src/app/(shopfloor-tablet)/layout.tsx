'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import OfflineSyncStatusBar from '@/components/tablet-ergonomics/OfflineSyncStatusBar';
import { QrCode, Wrench, RefreshCw, ArrowLeftRight, Monitor } from 'lucide-react';

export default function ShopfloorTabletLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const tabs = [
    { href: '/inspector-workflow/scan', label: '1. Inspector Dual-QR Scan (Sec 5.1)', icon: QrCode },
    { href: '/machine-pm', label: '2. Daily Machine PM Check (Sec 2.2)', icon: Wrench },
    { href: '/shift-handover', label: '3. Shift Handover Logbook (Sec 12.2)', icon: ArrowLeftRight },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col select-none">
      <OfflineSyncStatusBar />

      {/* High-Contrast Industrial Tablet Top Bar (Manual Search Strictly Disabled - Section 5.1) */}
      <header className="bg-slate-900 border-b-2 border-amber-500/60 px-5 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-black text-xs tracking-wider uppercase">
            RUGGED SHOPFLOOR TABLET MODE
          </span>
          <span className="text-xs text-slate-300 font-mono hidden sm:inline">
            🚫 MANUAL KEYBOARD JOB SEARCH DISABLED (SEC 5.1 PHYSICAL PRESENCE RULE)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = pathname.startsWith(t.href);
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition ${
                  active
                    ? 'bg-sky-500 text-slate-950 shadow-lg'
                    : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{t.label}</span>
              </Link>
            );
          })}

          <Link
            href="/dashboard"
            className="ml-2 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold flex items-center gap-1.5 text-sky-300"
          >
            <Monitor className="w-4 h-4" />
            Central Web Portal
          </Link>
        </div>
      </header>

      <main className="flex-1 p-5 max-w-7xl w-full mx-auto">{children}</main>
    </div>
  );
}