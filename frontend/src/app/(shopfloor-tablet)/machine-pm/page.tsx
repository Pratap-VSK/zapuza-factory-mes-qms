'use client';

import React, { useEffect, useState } from 'react';
import apiClient from '@/services/apiClient';

export default function MachinePmTabletPage() {
  const [stations, setStations] = useState<any[]>([]);

  const loadStations = async () => {
    const res = await apiClient.get('/plant-master/workstations/');
    setStations(res.data);
  };

  useEffect(() => {
    loadStations();
  }, []);

  const handleVerifyPm = async (stationId: string) => {
    await apiClient.post('/plant-master/pm-logs/', {
      workstation: stationId,
      shift: 'MORNING',
      zero_point_verified: true,
      coolant_level_ok: true,
      lubrication_pressure_ok: true,
      safety_interlocks_tested: true,
      tooling_wear_inspected: true,
      remarks: 'Verified on shopfloor rugged tablet.',
    });
    await loadStations();
  };

  return (
    <div className="bg-slate-900 border-2 border-slate-800 rounded-2xl p-6 space-y-5">
      <div>
        <span className="text-xs font-mono uppercase text-sky-400 font-bold">
          SECTION 2.2 • DAILY PREVENTIVE MAINTENANCE & ZERO-POINT CALIBRATION LOCK
        </span>
        <h1 className="text-2xl font-black text-white mt-1">
          Station Daily Setup Verification Checklist
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stations.map((st) => (
          <div key={st.id} className="p-5 rounded-2xl bg-slate-950 border-2 border-slate-800 space-y-3 text-xs">
            <div className="text-lg font-black text-white">{st.station_code}</div>
            <div className="text-slate-400">{st.name}</div>
            <div className="font-mono text-emerald-400">
              Status: {st.is_pm_valid_for_today ? '✓ PM Verified Today' : '🔒 PM Overdue'}
            </div>
            <button
              onClick={() => handleVerifyPm(st.id)}
              className="w-full bg-sky-500 hover:bg-sky-400 text-slate-950 font-black py-3.5 rounded-xl"
            >
              Sign Off Daily Zero-Point & PM Check
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}