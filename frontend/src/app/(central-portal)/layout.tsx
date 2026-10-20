'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import OfflineSyncStatusBar from '@/components/tablet-ergonomics/OfflineSyncStatusBar';
import {
  LayoutDashboard,
  Cpu,
  Ruler,
  PackageCheck,
  FileSpreadsheet,
  ShieldAlert,
  GitBranch,
  Truck,
  History,
  Tablet,
  LogOut,
  UserCheck,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/dashboard', label: '1. Live Shopfloor & Bottlenecks', icon: LayoutDashboard },
  { href: '/master-setup/factories', label: '2. Machines & Daily PM Locks', icon: Cpu },
  { href: '/master-setup/gauges', label: '2.3 Gauge Calibration Register', icon: Ruler },
  { href: '/dock-intake', label: '3. Raw Material & MTC Intake', icon: PackageCheck },
  { href: '/blueprint-studio', label: '4. Blueprint Pinning Studio', icon: FileSpreadsheet },
  { href: '/supervisor-review', label: '6. Supervisor & MRB Quarantine', icon: ShieldAlert },
  { href: '/travelers-traceability/search', label: '7. Part Lineage & Traceability', icon: GitBranch },
  { href: '/dispatch-gate', label: '10. Dispatch Interlock & CoA QR', icon: Truck },
  { href: '/audit-logs', label: '13. Immutable ISO Audit Trail', icon: History },
];

export default function CentralPortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const raw = localStorage.getItem('zpz_user');
    if (!raw) {
      router.push('/login');
      return;
    }
    setUser(JSON.parse(raw));
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('zpz_access_token');
    localStorage.removeItem('zpz_user');
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <OfflineSyncStatusBar />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-72 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0">
          <div>
            <div className="p-5 border-b border-slate-800">
              <div className="text-xs font-mono uppercase text-sky-400 font-bold tracking-wider">
                ZAPUZA TECHNOLOGIES LLP
              </div>
              <h1 className="text-lg font-extrabold text-white mt-0.5">Central QMS Portal</h1>
              {user && (
                <div className="mt-3 p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs">
                  <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5" />
                    {user.full_name || user.username}
                  </div>
                  <div className="text-slate-400 font-mono text-[11px] mt-0.5">
                    Role: {user.role} | {user.employee_code}
                  </div>
                </div>
              )}
            </div>

            <nav className="p-3 space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition ${
                      active
                        ? 'bg-sky-600 text-white shadow-md shadow-sky-950'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="p-4 border-t border-slate-800 space-y-2">
            <Link
              href="/inspector-workflow/scan"
              className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs px-4 py-3 rounded-lg flex items-center justify-center gap-2 transition shadow-lg"
            >
              <Tablet className="w-4 h-4" />
              Switch to Shopfloor Tablet UI
            </Link>
            <button
              onClick={handleLogout}
              className="w-full bg-slate-800 hover:bg-red-950 hover:text-red-300 text-slate-300 text-xs font-semibold px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 transition"
            >
              <LogOut className="w-4 h-4" />
              Switch Role / Logout
            </button>
          </div>
        </aside>

        {/* Main Content Workspace */}
        <main className="flex-1 overflow-y-auto p-6 bg-slate-950">{children}</main>
      </div>
    </div>
  );
}