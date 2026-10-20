'use client';

import React, { useEffect, useState } from 'react';
import apiClient from '@/services/apiClient';

export default function GaugesSetupPage() {
  const [gauges, setGauges] = useState<any[]>([]);

  useEffect(() => {
    apiClient.get('/plant-master/gauges/').then((res) => setGauges(res.data));
  }, []);

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <span className="text-xs font-mono uppercase text-sky-400 font-bold">
          SECTION 2.1.4 & 2.3 • MEASURING GAUGES & CALIBRATION ENFORCEMENT
        </span>
        <h1 className="text-2xl font-extrabold text-white mt-0.5">
          Master Measuring Equipment Register & Calibration Expiry Status
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {gauges.map((g) => (
          <div
            key={g.id}
            className={`p-5 rounded-2xl border text-xs space-y-2 ${
              g.is_calibration_expired ? 'bg-red-950/30 border-red-600' : 'bg-slate-900 border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-base font-black font-mono text-white">{g.gauge_serial}</span>
              <span
                className={`px-2.5 py-1 rounded font-bold ${
                  g.is_calibration_expired ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'
                }`}
              >
                {g.is_calibration_expired ? 'EXPIRED - BLOCKED' : 'CALIBRATED'}
              </span>
            </div>
            <div className="font-bold text-slate-200">{g.gauge_name}</div>
            <div className="text-slate-400 font-mono">
              Type: {g.gauge_type} | Least Count: {g.least_count}
            </div>
            <div className="text-slate-400 font-mono">
              Cert Ref: {g.calibration_certificate_ref} | Expiry: {g.calibration_expiry_date}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}