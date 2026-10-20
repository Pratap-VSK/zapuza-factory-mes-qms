'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import apiClient from '@/services/apiClient';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Cpu,
  Flame,
  ShieldAlert,
  Truck,
  Wrench,
} from 'lucide-react';

export default function DashboardPage() {
  const [workstations, setWorkstations] = useState<any[]>([]);
  const [travelers, setTravelers] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [gauges, setGauges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const [wsRes, trvRes, sesRes, gRes] = await Promise.all([
        apiClient.get('/plant-master/workstations/'),
        apiClient.get('/routing/travelers/'),
        apiClient.get('/quality/sessions/'),
        apiClient.get('/plant-master/gauges/'),
      ]);
      setWorkstations(wsRes.data);
      setTravelers(trvRes.data);
      setSessions(sesRes.data);
      setGauges(gRes.data);
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const timer = setInterval(fetchDashboardData, 10000);
    return () => clearInterval(timer);
  }, []);

  const expiredGauges = gauges.filter((g) => g.is_calibration_expired);
  const pendingSupervisorReviews = sessions.filter((s) => s.approval_status === 'PENDING_SUPERVISOR');
  const quarantinedTravelers = travelers.filter((t) => t.is_quarantined || t.status === 'QUARANTINED');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <span className="text-xs font-mono uppercase text-sky-400 font-bold">
            SECTION 1.2 & 8.3 • REAL-TIME SHOPFLOOR VISIBILITY
          </span>
          <h1 className="text-2xl font-extrabold text-white mt-0.5">
            Live Shopfloor Operations, Bottleneck & Quality Control Center
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/inspector-workflow/scan"
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs px-4 py-2.5 rounded-lg transition"
          >
            Open Inspector Tablet Scanner →
          </Link>
          <Link
            href="/blueprint-studio"
            className="bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs px-4 py-2.5 rounded-lg transition"
          >
            Blueprint Pinning Studio →
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>ACTIVE WORKSTATIONS (PM CLEAR)</span>
            <Cpu className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-white mt-2">
            {workstations.filter((w) => w.is_pm_valid_for_today).length} / {workstations.length}
          </div>
          <p className="text-[11px] text-emerald-400 mt-1">Daily Zero-Point & PM Interlocks Verified</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>ACTIVE DIGITAL TRAVELERS</span>
            <Activity className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-extrabold text-white mt-2">{travelers.length} Lots</div>
          <p className="text-[11px] text-sky-400 mt-1">100% Heat Lot & Routing Linked</p>
        </div>

        <div className="bg-slate-900 border border-amber-800/60 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-amber-300">
            <span>AWAITING SUPERVISOR REVIEW</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-amber-300 mt-2">
            {pendingSupervisorReviews.length} Checklists
          </div>
          <Link href="/supervisor-review" className="text-[11px] text-amber-400 underline mt-1 inline-block">
            Open Shift Supervisor Queue →
          </Link>
        </div>

        <div className="bg-slate-900 border border-red-800/70 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-red-300">
            <span>QUARANTINED / EXPIRED ALERTS</span>
            <ShieldAlert className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-extrabold text-red-400 mt-2">
            {quarantinedTravelers.length} Lots | {expiredGauges.length} Tool
          </div>
          <p className="text-[11px] text-red-300 mt-1">Locked by Automated Zero-Defect Boundary</p>
        </div>
      </div>

      {/* Live Digital Travelers & Mandatory Process Cooling Holds */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h2 className="text-sm font-bold uppercase tracking-wider text-sky-400 mb-4 flex items-center gap-2">
          <Flame className="w-4 h-4 text-orange-400" />
          Active Digital Job Travelers, Process Routing & Mandatory Cooling Hold Timers (Sections 7 & 8)
        </h2>

        {loading ? (
          <div className="text-xs text-slate-400 py-6">Loading live shopfloor travelers...</div>
        ) : (
          <div className="space-y-4">
            {travelers.map((trv) => (
              <div
                key={trv.id}
                className={`p-4 rounded-xl border ${
                  trv.status === 'COOLING_HOLD'
                    ? 'bg-red-950/25 border-red-700/80'
                    : trv.is_quarantined
                    ? 'bg-amber-950/30 border-amber-600'
                    : 'bg-slate-950 border-slate-800'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-extrabold text-sm bg-sky-500/10 border border-sky-500/40 text-sky-300 px-3 py-1 rounded">
                      {trv.traveler_barcode}
                    </span>
                    <span className="text-sm font-bold text-white">
                      {trv.part_number} — {trv.part_name}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      SN: {trv.serial_number} | Heat: <strong className="text-emerald-400">{trv.heat_number}</strong>
                    </span>
                  </div>

                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-full ${
                      trv.status === 'COOLING_HOLD'
                        ? 'bg-red-600 text-white animate-pulse'
                        : trv.status === 'CLEARED_FOR_DISPATCH'
                        ? 'bg-emerald-600 text-white'
                        : trv.is_quarantined
                        ? 'bg-amber-600 text-slate-950'
                        : 'bg-sky-900/70 text-sky-200 border border-sky-700'
                    }`}
                  >
                    {trv.status}
                  </span>
                </div>

                {/* Process Routing Sequence Bar */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                  {trv.operations?.map((op: any) => (
                    <div
                      key={op.id}
                      className={`p-3 rounded-lg border text-xs ${
                        op.remaining_hold_seconds > 0
                          ? 'bg-red-950/70 border-red-500 text-red-100'
                          : op.status === 'COMPLETED'
                          ? 'bg-emerald-950/30 border-emerald-800/70 text-emerald-200'
                          : 'bg-slate-900 border-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span>
                          Op {op.sequence_number}: {op.operation_name}
                        </span>
                        <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-black/40">
                          {op.station_code}
                        </span>
                      </div>
                      <div className="mt-1.5 flex items-center justify-between text-[11px]">
                        <span>Status: {op.status}</span>
                        {op.remaining_hold_seconds > 0 && (
                          <span className="font-extrabold text-red-300 animate-pulse">
                            🔒 COOLING HOLD: {Math.floor(op.remaining_hold_seconds / 3600)}h{' '}
                            {Math.floor((op.remaining_hold_seconds % 3600) / 60)}m rem
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Workstation Health & Tool Calibration Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
            <Wrench className="w-4 h-4 text-sky-400" />
            Workstation Daily PM & Calibration Locks (Section 2.2)
          </h3>
          <div className="space-y-2.5">
            {workstations.map((ws) => (
              <div
                key={ws.id}
                className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-bold text-white">
                    {ws.station_code} — {ws.name}
                  </div>
                  <div className="text-slate-400 text-[11px]">{ws.factory_site_name}</div>
                </div>
                <span
                  className={`px-2.5 py-1 rounded font-bold ${
                    ws.is_pm_valid_for_today
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                      : 'bg-red-950 text-red-300 border border-red-700'
                  }`}
                >
                  {ws.is_pm_valid_for_today ? '✓ PM VERIFIED TODAY' : '🔒 LOCKED: PM OVERDUE'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Measuring Gauge Calibration Enforcement (Section 2.3)
          </h3>
          <div className="space-y-2.5">
            {gauges.map((g) => (
              <div
                key={g.id}
                className={`p-3 rounded-lg border flex items-center justify-between text-xs ${
                  g.is_calibration_expired
                    ? 'bg-red-950/40 border-red-700/80'
                    : 'bg-slate-950 border-slate-800'
                }`}
              >
                <div>
                  <div className="font-bold text-white font-mono">
                    {g.gauge_serial} — {g.gauge_name}
                  </div>
                  <div className="text-slate-400 text-[11px]">
                    Type: {g.gauge_type} | Expiry: {g.calibration_expiry_date}
                  </div>
                </div>
                <span
                  className={`px-2.5 py-1 rounded font-bold ${
                    g.is_calibration_expired
                      ? 'bg-red-600 text-white'
                      : 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                  }`}
                >
                  {g.is_calibration_expired ? '⛔ EXPIRED (BLOCKED)' : '✓ CALIBRATED'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}