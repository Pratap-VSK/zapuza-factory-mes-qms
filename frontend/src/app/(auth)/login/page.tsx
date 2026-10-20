'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/services/apiClient';
import { Shield, QrCode, Lock, UserCheck, Factory, Tablet } from 'lucide-react';

const DEMO_BADGES = [
  { label: 'Quality Manager (Vikram)', username: 'qm_vikram', badge: 'BADGE-QM-03', role: 'Approvals, Concessions & MRB', target: '/dashboard' },
  { label: 'Quality Engineer (Rahul)', username: 'qe_rahul', badge: 'BADGE-QE-02', role: 'Blueprint Pinning Studio & CTQ', target: '/blueprint-studio' },
  { label: 'QA Floor Inspector (Rohit)', username: 'insp_rohit', badge: 'BADGE-INSP-05', role: 'Rugged Tablet Dual-QR Inspector', target: '/inspector-workflow/scan' },
  { label: 'Shift Supervisor (Amit)', username: 'sup_amit', badge: 'BADGE-SUP-04', role: 'Supervisor Queue & Quarantine', target: '/supervisor-review' },
  { label: 'Machine Operator (Suresh)', username: 'op_suresh', badge: 'BADGE-OP-06', role: 'First-Piece, PM & Cooling Holds', target: '/shift-handover' },
  { label: 'Dock & Dispatch Clerk (Kiran)', username: 'dock_kiran', badge: 'BADGE-DOCK-07', role: 'MTC Intake & Shipping Gate Pass', target: '/dock-intake' },
  { label: 'Plant Manager (Admin)', username: 'plant_mgr', badge: 'BADGE-PM-01', role: 'Full Plant Oversight & Audit Trail', target: '/dashboard' },
];

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('qm_vikram');
  const [password, setPassword] = useState('zapuza123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.post('/accounts/login/', { username, password });
      localStorage.setItem('zpz_access_token', res.data.access);
      localStorage.setItem('zpz_user', JSON.stringify(res.data.user));
      if (res.data.user.role === 'QA_INSPECTOR') {
        router.push('/inspector-workflow/scan');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Login failed. Ensure backend server is running on port 8000.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickBadgeScan = async (badgeToken: string, redirectPath: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.post('/accounts/users/badge_login/', { badge_qr_token: badgeToken });
      localStorage.setItem('zpz_access_token', res.data.access);
      localStorage.setItem('zpz_user', JSON.stringify(res.data.user));
      router.push(redirectPath);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Badge QR login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-6">
      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
        
        {/* Left Column: Standard Portal Login */}
        <div className="lg:col-span-5 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-800 pb-6 lg:pb-0 lg:pr-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400">
                <Factory className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white">ZAPUZA MES / QMS</h1>
                <p className="text-xs text-slate-400">Factory Operations & Quality Control v5.0</p>
              </div>
            </div>

            <form onSubmit={handlePasswordLogin} className="space-y-4 mt-6">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Employee Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Security Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-950/80 border border-red-700 text-red-200 text-xs">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold py-3.5 rounded-lg transition flex items-center justify-center gap-2 shadow-lg shadow-sky-900/40"
              >
                <Lock className="w-4 h-4" />
                {loading ? 'Authenticating...' : 'Sign In to Central Portal'}
              </button>
            </form>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/80 text-xs text-slate-400 flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Section 13.3: All sessions are bound to hardware Device Serial & Immutable Audit Logs.</span>
          </div>
        </div>

        {/* Right Column: Instant Employee Badge QR Login (Role Switcher) */}
        <div className="lg:col-span-7 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-sky-400 flex items-center gap-2">
                <QrCode className="w-5 h-5" />
                Instant Employee Badge QR Scan (Section 12 Role Matrix)
              </h2>
              <span className="text-xs bg-emerald-950 text-emerald-300 border border-emerald-700/60 px-2.5 py-0.5 rounded-full">
                1-Tap Demo Switcher
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Tap any plant role badge below to authenticate and jump directly into that role&apos;s designated workspace:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {DEMO_BADGES.map((b) => (
                <button
                  key={b.badge}
                  onClick={() => handleQuickBadgeScan(b.badge, b.target)}
                  disabled={loading}
                  className="text-left p-3.5 rounded-xl bg-slate-950/90 hover:bg-slate-800 border border-slate-800 hover:border-sky-500/60 transition group flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="font-bold text-sm text-white group-hover:text-sky-400 transition">
                      {b.label}
                    </span>
                    <span className="text-[10px] font-mono bg-slate-900 border border-slate-700 px-2 py-0.5 rounded text-slate-300">
                      {b.badge}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">{b.role}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 p-3.5 rounded-xl bg-amber-950/30 border border-amber-700/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Tablet className="w-6 h-6 text-amber-400 shrink-0" />
              <div className="text-xs">
                <p className="font-bold text-amber-200">Want to test the Rugged Shopfloor Tablet UI directly?</p>
                <p className="text-amber-300/80">Includes Dual-QR Lock, Glove Keypad, Expired Tool Block & 2-Photo Defect Camera.</p>
              </div>
            </div>
            <button
              onClick={() => handleQuickBadgeScan('BADGE-INSP-05', '/inspector-workflow/scan')}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs px-4 py-2.5 rounded-lg shrink-0 transition"
            >
              Launch Tablet Mode →
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}