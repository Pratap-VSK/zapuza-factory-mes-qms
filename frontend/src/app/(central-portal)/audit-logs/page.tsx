'use client';

import React, { useEffect, useState } from 'react';
import apiClient from '@/services/apiClient';
import { Shield, Lock } from 'lucide-react';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    apiClient.get('/accounts/audit-logs/').then((res) => setLogs(res.data));
  }, []);

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
        <div>
          <span className="text-xs font-mono uppercase text-emerald-400 font-bold">
            SECTION 13.3 • TAMPER-PROOF ISO / AEROSPACE / AUTOMOTIVE AUDIT TRAIL
          </span>
          <h1 className="text-2xl font-extrabold text-white mt-0.5">
            Immutable Cryptographic System Activity Log (Append-Only SHA-256 Chain)
          </h1>
        </div>
        <span className="bg-emerald-950 border border-emerald-700 text-emerald-300 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5">
          <Lock className="w-4 h-4" /> Edit / Delete Strictly Blocked at DB Level
        </span>
      </div>

      <div className="space-y-2.5">
        {logs.map((log) => (
          <div key={log.id} className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono space-y-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold text-white">
                [{new Date(log.timestamp).toLocaleString()}] {log.action}
              </span>
              <span className="text-sky-400">
                User: {log.username} ({log.user_role}) | Device: {log.device_serial} | IP: {log.ip_address}
              </span>
            </div>
            <div className="text-[11px] text-emerald-400 truncate">
              SHA-256 Chain Integrity Hash: {log.integrity_hash}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}