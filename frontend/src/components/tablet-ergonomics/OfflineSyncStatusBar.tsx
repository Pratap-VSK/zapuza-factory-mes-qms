'use client';

import React, { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { offlineDB } from '@/services/offline/db';
import { flushOfflineInspectionQueue } from '@/services/offline/syncEngine';
import { Wifi, WifiOff, RefreshCw, ShieldCheck, Tablet } from 'lucide-react';

export default function OfflineSyncStatusBar() {
  const [isOnline, setIsOnline] = useState(true);
  const [simulatedOffline, setSimulatedOffline] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const pendingQueue = useLiveQuery(
    () => offlineDB.inspectionSyncQueue.toArray(),
    [],
    []
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsOnline(navigator.onLine);
    const sim = localStorage.getItem('zpz_simulate_offline') === 'true';
    setSimulatedOffline(sim);

    const handleOnline = () => {
      setIsOnline(true);
      if (localStorage.getItem('zpz_simulate_offline') !== 'true') {
        handleManualSync();
      }
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const toggleSimulateOffline = () => {
    const nextState = !simulatedOffline;
    setSimulatedOffline(nextState);
    localStorage.setItem('zpz_simulate_offline', String(nextState));
    if (!nextState) {
      handleManualSync();
    }
  };

  const handleManualSync = async () => {
    setSyncing(true);
    await flushOfflineInspectionQueue();
    setSyncing(false);
  };

  const effectiveOnline = isOnline && !simulatedOffline;

  return (
    <div className="bg-slate-950 border-b border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between text-xs text-slate-300 gap-2">
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5 font-mono text-sky-400 font-semibold">
          <Tablet className="w-4 h-4" />
          DEVICE: ZPZ-IND-TAB-04
        </span>
        <span className="hidden md:flex items-center gap-1 text-emerald-400">
          <ShieldCheck className="w-4 h-4" />
          HMAC-SHA256 & ISO AUDIT ACTIVE
        </span>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={toggleSimulateOffline}
          className={`px-2.5 py-1 rounded font-semibold transition flex items-center gap-1.5 border ${
            effectiveOnline
              ? 'bg-emerald-950/60 border-emerald-700 text-emerald-300 hover:bg-emerald-900/60'
              : 'bg-amber-950 border-amber-500 text-amber-300 animate-pulse'
          }`}
        >
          {effectiveOnline ? (
            <>
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              Factory Wi-Fi: ONLINE (Click to Simulate Drop)
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5 text-amber-400" />
              OFFLINE CACHING MODE ACTIVE (Click to Reconnect)
            </>
          )}
        </button>

        {pendingQueue && pendingQueue.length > 0 && (
          <button
            onClick={handleManualSync}
            disabled={!effectiveOnline || syncing}
            className="bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 text-white px-3 py-1 rounded font-bold flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            Pending Offline Sync ({pendingQueue.length})
          </button>
        )}
      </div>
    </div>
  );
}