'use client';

import React, { useEffect, useState } from 'react';
import apiClient from '@/services/apiClient';

export default function ShiftHandoverPage() {
  const [logs, setLogs] = useState<any[]>([]);

  const loadLogs = async () => {
    const res = await apiClient.get('/shift-handover/logs/');
    setLogs(res.data);
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const handleAcknowledge = async (id: string) => {
    await apiClient.post(`/shift-handover/logs/${id}/acknowledge_handover/`);
    await loadLogs();
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border-2 border-slate-800 rounded-2xl p-6">
        <span className="text-xs font-mono uppercase text-amber-400 font-bold">
          SECTION 12.2 • DIGITAL SHIFT HANDOVER LOGBOOK
        </span>
        <h1 className="text-2xl font-black text-white mt-1">
          Mandatory Outgoing / Incoming Operator Shift Handover Sign-Off
        </h1>

        <div className="mt-6 space-y-4">
          {logs.map((log) => (
            <div key={log.id} className="p-5 rounded-2xl bg-slate-950 border-2 border-slate-800 space-y-3 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-base font-black text-white">
                  Station: {log.station_code} ({log.outgoing_shift} → {log.incoming_shift} Shift)
                </div>
                <span
                  className={`px-3 py-1 rounded-lg font-extrabold ${
                    log.is_acknowledged_by_incoming ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-slate-950'
                  }`}
                >
                  {log.is_acknowledged_by_incoming ? '✓ Acknowledged by Incoming Operator' : 'Pending Incoming Sign-Off'}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-slate-300">
                <div>Active Traveler: {log.active_job_traveler_barcode}</div>
                <div>Parts Produced: {log.total_parts_produced_in_shift} pcs</div>
                <div>Scrap Count: {log.current_scrap_count} pcs</div>
              </div>
              <div className="text-slate-300">
                <strong>Tool Wear:</strong> {log.tool_wear_status} | <strong>Machine Health:</strong> {log.machine_health_notes}
              </div>
              {!log.is_acknowledged_by_incoming && (
                <button
                  onClick={() => handleAcknowledge(log.id)}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-xl text-sm transition"
                >
                  ✓ DIGITALLY ACKNOWLEDGE SHIFT HANDOVER & UNLOCK WORKSTATION
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}