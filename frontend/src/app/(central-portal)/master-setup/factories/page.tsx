'use client';

import React, { useEffect, useState } from 'react';
import apiClient from '@/services/apiClient';

export default function FactoriesSetupPage() {
  const [workstations, setWorkstations] = useState<any[]>([]);

  const loadStations = async () => {
    const res = await apiClient.get('/plant-master/workstations/');
    setWorkstations(res.data);
  };

  useEffect(() => {
    loadStations();
  }, []);

  const togglePmStatus = async (ws: any) => {
    await apiClient.post('/plant-master/pm-logs/', {
      workstation: ws.id,
      shift: 'MORNING',
      zero_point_verified: !ws.is_pm_valid_for_today,
      coolant_level_ok: true,
      lubrication_pressure_ok: true,
      safety_interlocks_tested: true,
      tooling_wear_inspected: true,
      remarks: 'Toggled via Master Setup Portal',
    });
    await loadStations();
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <span className="text-xs font-mono uppercase text-sky-400 font-bold">
          SECTION 2.1 & 2.2 • PLANT INFRASTRUCTURE & MACHINE PM CALIBRATION LOCKS
        </span>
        <h1 className="text-2xl font-extrabold text-white mt-0.5">
          Workstation Registry, Signed Station QR Tokens & Daily PM Locks
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {workstations.map((ws) => (
          <div key={ws.id} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="space-y-1">
              <div className="text-base font-extrabold text-white">
                {ws.station_code} — {ws.name}
              </div>
              <div className="text-slate-400">
                Department: {ws.factory_site_name} | Type: {ws.machine_type}
              </div>
              <div className="font-mono text-[11px] text-sky-400 break-all">
                Signed Station QR Token: {ws.qr_code_token}
              </div>
            </div>
            <button
              onClick={() => togglePmStatus(ws)}
              className={`px-4 py-2.5 rounded-xl font-black transition ${
                ws.is_pm_valid_for_today
                  ? 'bg-emerald-600 text-white'
                  : 'bg-red-600 text-white animate-pulse'
              }`}
            >
              {ws.is_pm_valid_for_today ? '✓ PM Verified (Click to Simulate Overdue Lock)' : '🔒 PM Overdue (Click to Verify PM)'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}