'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/services/apiClient';
import { QrCode, ShieldAlert, CheckCircle2, Flame, Camera, Lock, ArrowRight } from 'lucide-react';

export default function DualQrScannerPage() {
  const router = useRouter();
  const [stationQr, setStationQr] = useState('');
  const [travelerQr, setTravelerQr] = useState('');
  const [loading, setLoading] = useState(false);
  const [interlockError, setInterlockError] = useState<any>(null);

  const handleStartInspection = async (stCode?: string, trvCode?: string) => {
    const finalStation = stCode ?? stationQr;
    const finalTraveler = trvCode ?? travelerQr;
    setStationQr(finalStation);
    setTravelerQr(finalTraveler);
    setInterlockError(null);
    setLoading(true);

    try {
      const res = await apiClient.post('/quality/sessions/dual_qr_unlock/', {
        station_qr: finalStation,
        traveler_qr: finalTraveler,
        stage_type: 'FINAL_PDI',
      });
      router.push(`/inspector-workflow/execute/${res.data.id}`);
    } catch (err: any) {
      setInterlockError(
        err?.response?.data || {
          interlock_type: 'HARDWARE_INTERLOCK',
          message: 'Failed to unlock station checklist.',
        }
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border-2 border-slate-800 rounded-2xl p-6">
        <span className="text-xs font-mono font-bold text-amber-400 uppercase">
          BRD Section 5.1 • Station QR Code Scanning & Physical Presence Rule
        </span>
        <h1 className="text-2xl font-black text-white mt-1">
          Mandatory 2-Step Physical QR Scan to Unlock Checklist
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          To prevent inspectors from filling forms from a desk or breakroom, manual keyboard searching is disabled.
          Scan both the <strong className="text-white">Machine Frame QR</strong> and <strong className="text-white">Job Traveler Sheet Barcode</strong>.
        </p>

        {/* Step 1 & Step 2 Visual Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div
            className={`p-6 rounded-2xl border-2 flex flex-col justify-between ${
              stationQr ? 'bg-emerald-950/30 border-emerald-500' : 'bg-slate-950 border-slate-700'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase text-sky-400 font-bold">STEP 1: WORKSTATION FRAME QR</span>
                {stationQr && <CheckCircle2 className="w-6 h-6 text-emerald-400" />}
              </div>
              <div className="text-xl font-black mt-2 font-mono">
                {stationQr ? `SCANNED: ${stationQr}` : 'Awaiting Camera QR Scan...'}
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setStationQr('CNC-LATHE-04')}
                className="px-4 py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs flex items-center gap-2"
              >
                <Camera className="w-4 h-4" />
                Scan Machine QR: CNC-LATHE-04
              </button>
              <button
                type="button"
                onClick={() => setStationQr('GRIND-VMC-02')}
                className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-2 border border-slate-600"
              >
                <Camera className="w-4 h-4" />
                Scan Grinder QR: GRIND-VMC-02
              </button>
            </div>
          </div>

          <div
            className={`p-6 rounded-2xl border-2 flex flex-col justify-between ${
              travelerQr ? 'bg-emerald-950/30 border-emerald-500' : 'bg-slate-950 border-slate-700'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase text-amber-400 font-bold">STEP 2: JOB TRAVELER BARCODE</span>
                {travelerQr && <CheckCircle2 className="w-6 h-6 text-emerald-400" />}
              </div>
              <div className="text-xl font-black mt-2 font-mono">
                {travelerQr ? `SCANNED: ${travelerQr}` : 'Awaiting Traveler Barcode...'}
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setTravelerQr('TRV-8801-A')}
                className="px-4 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center gap-2"
              >
                <QrCode className="w-4 h-4" />
                Scan Active Traveler: TRV-8801-A
              </button>
              <button
                type="button"
                onClick={() => setTravelerQr('TRV-8801-HOLD')}
                className="px-4 py-3 rounded-xl bg-red-950 hover:bg-red-900 text-red-200 font-bold text-xs flex items-center gap-2 border border-red-700"
              >
                <Flame className="w-4 h-4 text-red-400" />
                Scan Cooling-Hold Lot: TRV-8801-HOLD
              </button>
            </div>
          </div>
        </div>

        {/* Unlock Action & Quick Demo Scenarios */}
        <div className="mt-6 pt-6 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => handleStartInspection('CNC-LATHE-04', 'TRV-8801-A')}
              className="px-5 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm flex items-center gap-2 shadow-lg"
            >
              ⚡ 1-Tap Demo: Scan Valid Station + Traveler & Open Locked PDI Form
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => handleStartInspection('GRIND-VMC-02', 'TRV-8801-HOLD')}
              className="px-5 py-3.5 rounded-xl bg-red-600/20 hover:bg-red-600/30 border-2 border-red-500 text-red-300 font-extrabold text-xs flex items-center gap-2"
            >
              <Flame className="w-4 h-4 text-red-400" />
              Test Section 8.2 Interlock: Scan Heat-Treat Cooling Hold Lot (1 hr 22 min left)
            </button>
          </div>

          <button
            type="button"
            disabled={!stationQr || !travelerQr || loading}
            onClick={() => handleStartInspection()}
            className="px-6 py-3.5 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-black text-sm flex items-center gap-2"
          >
            <Lock className="w-4 h-4" />
            {loading ? 'Verifying Signatures...' : 'Verify Dual-QR & Unlock Station'}
          </button>
        </div>
      </div>

      {/* Section 8.2 / 2.2 Flashing RED Hardware Interlock Screen */}
      {interlockError && (
        <div className="p-8 rounded-2xl bg-red-950 border-4 border-red-500 text-white shadow-2xl animate-pulse space-y-3">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-10 h-10 text-red-300 shrink-0" />
            <div>
              <span className="text-xs font-mono uppercase bg-red-500 text-slate-950 font-black px-2.5 py-1 rounded">
                INTERLOCK TRIGGERED: {interlockError.interlock_type}
              </span>
              <h2 className="text-2xl font-black mt-1">{interlockError.message}</h2>
            </div>
          </div>
          {interlockError.details && (
            <pre className="bg-slate-950/90 p-4 rounded-xl text-xs font-mono text-red-200 overflow-x-auto border border-red-800">
              {JSON.stringify(interlockError.details, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}