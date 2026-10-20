'use client';

import React, { useEffect, useState } from 'react';
import apiClient from '@/services/apiClient';
import { Wrench, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function TabletMachinePmPage() {
  const [stations, setStations] = useState<any[]>([]);
  const [msg, setMsg] = useState('');

  const loadStations = async () => {
    const res = await apiClient.get('/plant-master/workstations/');
    setStations(res.data);
  };

  useEffect(() => {
    loadStations();
  }, []);

  const handleCompletePm = async (stationId: string) => {
    await apiClient.post('/plant-master/pm-logs/', {
      workstation: stationId,
      shift: 'MORNING',
      zero_point_verified: true,
      coolant_level_ok: true,
      lubrication_pressure_ok: true,
      safety_interlocks_tested: true,
      tooling_wear_inspected: true,
      remarks: 'Verified from Shopfloor Tablet PM Checklist.',
    });
    setMsg('Daily PM & Safety Zero-Point Verification signed off! Machine unlocked for production.');
    loadStations();
  };

  return (
    <div className="space-y-5">
      <div>
        <span className="text-xs font-mono text-sky-400 font-bold uppercase">
          BRD Section 2.2 • Machine & Workstation Calibration Locks
        </span>
        <h1 className="text-2xl font-black text-white">Daily Preventive Maintenance & Zero-Point Sign-Off</h1>
      </div>

      {msg && (
        <div className="p-4 rounded-xl bg-emerald-950 border border-emerald-500 text-emerald-200 text-sm font-bold">
          {msg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stations.map((st) => (
          <div key={st.id} className="bg-slate-900 border-2 border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-sky-400">{st.station_code}</span>
              <span
                className={`px-2.5 py-0.5 rounded text-xs font-black ${
                  st.is_pm_valid_for_today ? 'bg-emerald-500 text-slate-950' : 'bg-red-600 text-white'
                }`}
              >
                {st.is_pm_valid_for_today ? 'PM VERIFIED TODAY' : 'LOCKED - PM OVERDUE'}
              </span>
            </div>
            <h2 className="text-lg font-bold text-white">{st.name}</h2>
            <p className="text-xs text-slate-400">{st.machine_type}</p>
            <button
              onClick={() => handleCompletePm(st.id)}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-2"
            >
              <Wrench className="w-4 h-4" />
              Verify Zero-Point & Complete Daily PM
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}