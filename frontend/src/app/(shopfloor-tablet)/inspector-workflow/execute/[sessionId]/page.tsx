'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import apiClient from '@/services/apiClient';
import { offlineDB } from '@/services/offline/db';
import GloveNumericKeypad from '@/components/tablet-ergonomics/GloveNumericKeypad';
import {
  Camera,
  CheckCircle2,
  AlertOctagon,
  Ruler,
  Lock,
  Send,
  WifiOff,
  ShieldAlert,
} from 'lucide-react';

export default function ExecuteLockedInspectionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params?.sessionId as string;

  const [session, setSession] = useState<any>(null);
  const [gauges, setGauges] = useState<any[]>([]);
  const [activePinIndex, setActivePinIndex] = useState(0);
  const [readings, setReadings] = useState<Record<string, any>>({});
  const [toolError, setToolError] = useState<string>('');
  const [submitError, setSubmitError] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [remarks, setRemarks] = useState('All shaft setup & surface parameters inspected at station.');

  useEffect(() => {
    const loadData = async () => {
      try {
        const [sessRes, gaugeRes] = await Promise.all([
          apiClient.get(`/quality/sessions/${sessionId}/`),
          apiClient.get('/plant-master/gauges/'),
        ]);
        setSession(sessRes.data);
        setGauges(gaugeRes.data);

        // Initialize readings state for every pin
        const init: Record<string, any> = {};
        const pins = sessRes.data.template_details?.pins || [];
        pins.forEach((p: any) => {
          const matchingGauge = gaugeRes.data.find(
            (g: any) => g.gauge_type === p.required_gauge_type && !g.is_calibration_expired
          );
          init[p.id] = {
            pin_id: p.id,
            gauge_serial: matchingGauge ? matchingGauge.gauge_serial : 'VC-104',
            measured_numeric_value: '',
            visual_pass: p.inspection_type === 'VISUAL_PASS_FAIL' ? true : null,
            defect_photo_1_url: '',
            defect_photo_2_url: '',
          };
        });
        setReadings(init);
      } catch (err) {
        console.error(err);
      }
    };
    if (sessionId) loadData();
  }, [sessionId]);

  if (!session) {
    return <div className="p-8 font-mono text-sm text-slate-400">Loading Locked Station Checklist...</div>;
  }

  const pins: any[] = session.template_details?.pins || [];
  const activePin = pins[activePinIndex];
  const currentEntry = activePin ? readings[activePin.id] || {} : {};

  // Evaluate real-time GREEN vs RED tolerance (Section 5.3 & 5.4)
  const evaluatePinStatus = (pin: any, entry: any): 'EMPTY' | 'GREEN' | 'RED' => {
    if (!entry) return 'EMPTY';
    if (pin.inspection_type === 'VISUAL_PASS_FAIL') {
      if (entry.visual_pass === null || entry.visual_pass === undefined) return 'EMPTY';
      return entry.visual_pass ? 'GREEN' : 'RED';
    }
    if (entry.measured_numeric_value === '' || entry.measured_numeric_value === null) return 'EMPTY';
    const num = Number(entry.measured_numeric_value);
    if (isNaN(num)) return 'EMPTY';
    const min = pin.min_allowed_limit !== null ? Number(pin.min_allowed_limit) : null;
    const max = pin.max_allowed_limit !== null ? Number(pin.max_allowed_limit) : null;
    if (min !== null && num < min) return 'RED';
    if (max !== null && num > max) return 'RED';
    return 'GREEN';
  };

  const handleSelectGauge = async (pin: any, gaugeSerial: string) => {
    setToolError('');
    try {
      await apiClient.post('/plant-master/gauges/verify_tool/', {
        gauge_serial: gaugeSerial,
        required_gauge_type: pin.required_gauge_type,
      });
      setReadings((prev) => ({
        ...prev,
        [pin.id]: { ...prev[pin.id], gauge_serial: gaugeSerial },
      }));
    } catch (err: any) {
      setToolError(
        err?.response?.data?.message ||
          `Expired Tool Calibration: ${gaugeSerial} is blocked! Obtain a calibrated tool from the tool crib.`
      );
    }
  };

  const handleCaptureDefectPhoto = (pinId: string, slot: 1 | 2) => {
    const timestamp = new Date().toLocaleTimeString();
    const simulatedPhotoDataUrl = `https://placehold.co/600x400/7f1d1d/fecaca?text=DEFECT+EVIDENCE+PHOTO+${slot}+(${encodeURIComponent(
      timestamp
    )})`;
    setReadings((prev) => ({
      ...prev,
      [pinId]: {
        ...prev[pinId],
        [slot === 1 ? 'defect_photo_1_url' : 'defect_photo_2_url']: simulatedPhotoDataUrl,
      },
    }));
  };

  const handleSubmitChecklist = async () => {
    setSubmitError('');
    setSubmitting(true);
    const payloadList = Object.values(readings);

    // Check if Factory Offline Mode is active (Section 13 / 7.2)
    const isSimulatedOffline = localStorage.getItem('zpz_simulate_offline') === 'true' || !navigator.onLine;
    if (isSimulatedOffline) {
      await offlineDB.inspectionSyncQueue.add({
        sessionId: session.id,
        sessionCode: session.session_code,
        travelerBarcode: session.traveler_barcode,
        stationCode: session.station_code,
        readings: payloadList as any,
        inspectorRemarks: remarks,
        queuedAt: new Date().toISOString(),
        syncStatus: 'PENDING_WIFI',
      });
      setSubmitting(false);
      alert(
        '📦 Saved to Tablet Offline Cache (IndexedDB)! As soon as Factory Wi-Fi reconnects, this checklist will automatically sync to the server.'
      );
      router.push('/supervisor-review');
      return;
    }

    try {
      await apiClient.post(`/quality/sessions/${session.id}/submit_checklist/`, {
        readings: payloadList,
        inspector_remarks: remarks,
      });
      router.push('/supervisor-review');
    } catch (err: any) {
      setSubmitError(
        err?.response?.data?.message || JSON.stringify(err?.response?.data) || 'Checklist validation failed.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const activeStatus = activePin ? evaluatePinStatus(activePin, currentEntry) : 'EMPTY';

  return (
    <div className="space-y-5">
      {/* Locked Tablet Banner */}
      <div className="bg-slate-900 border-2 border-sky-500/50 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-sky-500 text-slate-950 font-black">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-sky-400 font-bold">
              <span>SESSION: {session.session_code}</span>
              <span>•</span>
              <span>STATION: {session.station_code}</span>
              <span>•</span>
              <span>TRAVELER: {session.traveler_barcode} (SN: {session.serial_number})</span>
            </div>
            <h1 className="text-lg font-black text-white">
              Locked Step-by-Step Inspection: {session.template_details?.title}
            </h1>
          </div>
        </div>

        {/* Stepper Pills */}
        <div className="flex items-center gap-2">
          {pins.map((p, idx) => {
            const st = evaluatePinStatus(p, readings[p.id]);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setToolError('');
                  setActivePinIndex(idx);
                }}
                className={`px-3.5 py-2 rounded-xl font-black text-xs border-2 transition ${
                  idx === activePinIndex ? 'ring-4 ring-white/30 scale-105' : ''
                } ${
                  st === 'GREEN'
                    ? 'bg-emerald-600 border-emerald-300 text-white'
                    : st === 'RED'
                    ? 'bg-red-600 border-red-300 text-white animate-pulse'
                    : p.is_ctq
                    ? 'bg-orange-950 border-orange-500 text-orange-300'
                    : 'bg-slate-800 border-slate-600 text-slate-300'
                }`}
              >
                Pin #{p.pin_number} {p.is_ctq ? '[CTQ]' : ''}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tool Calibration Lock Alert (Section 2.3) */}
      {toolError && (
        <div className="p-5 rounded-2xl bg-red-950 border-4 border-red-500 text-white flex items-center justify-between animate-bounce">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-8 h-8 text-red-300 shrink-0" />
            <div>
              <div className="text-xs font-mono uppercase bg-red-500 text-slate-950 font-black px-2 py-0.5 rounded inline-block">
                SECTION 2.3 TOOL CALIBRATION LOCK TRIGGERED
              </div>
              <p className="text-base font-extrabold mt-1">{toolError}</p>
            </div>
          </div>
          <button
            onClick={() => setToolError('')}
            className="px-4 py-2 rounded-lg bg-slate-900 text-xs font-bold border border-red-400"
          >
            Acknowledge
          </button>
        </div>
      )}

      {submitError && (
        <div className="p-4 rounded-xl bg-red-950 border-2 border-red-500 text-red-200 text-sm font-bold flex items-center gap-2">
          <AlertOctagon className="w-5 h-5 text-red-400 shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      {/* Main Split-Screen: Left Blueprint with Active Pin Highlight, Right Measurement Entry */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 6 Cols: Interactive Blueprint Pin View */}
        <div className="lg:col-span-6 space-y-3">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <div className="text-xs text-slate-400 mb-2 flex justify-between">
              <span>Tap any numbered pin on the blueprint to highlight its data field:</span>
              <span className="font-mono text-sky-400">{session.template_details?.revision_number}</span>
            </div>

            <div className="relative w-full aspect-[2/1] bg-[#0a192f] border-2 border-slate-700 rounded-xl overflow-hidden">
              <img
                src={session.template_details?.blueprint_image_url || '/blueprint-shaft-cad.svg'}
                alt="Blueprint"
                className="w-full h-full object-contain"
              />
              {pins.map((p, idx) => {
                const st = evaluatePinStatus(p, readings[p.id]);
                const isCurr = idx === activePinIndex;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setToolError('');
                      setActivePinIndex(idx);
                    }}
                    style={{ left: `${p.x_coord_percent}%`, top: `${p.y_coord_percent}%` }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full font-black text-xs flex items-center justify-center border-2 border-white transition ${
                      st === 'GREEN'
                        ? 'bg-emerald-500 text-slate-950'
                        : st === 'RED'
                        ? 'bg-red-600 text-white animate-ping-slow'
                        : p.is_ctq
                        ? 'bg-orange-500 text-slate-950'
                        : 'bg-sky-500 text-slate-950'
                    } ${isCurr ? 'scale-125 ring-4 ring-white z-20' : 'opacity-85 z-10'}`}
                  >
                    #{p.pin_number}
                  </button>
                );
              })}
            </div>
          </div>

          {/* All Parameters Summary Status */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
            <h3 className="text-xs font-mono uppercase text-slate-400 font-bold">
              Checklist Completion Progress (All fields required before unlocking Submit)
            </h3>
            {pins.map((p, idx) => {
              const entry = readings[p.id] || {};
              const st = evaluatePinStatus(p, entry);
              return (
                <div
                  key={p.id}
                  onClick={() => setActivePinIndex(idx)}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer ${
                    st === 'GREEN'
                      ? 'bg-emerald-950/40 border-emerald-600 text-emerald-200'
                      : st === 'RED'
                      ? 'bg-red-950/60 border-red-500 text-red-200'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="text-xs font-bold">
                    Pin #{p.pin_number}: {p.parameter_name}{' '}
                    {p.is_ctq && <span className="text-orange-400 font-extrabold">[CTQ]</span>}
                  </div>
                  <div className="font-mono text-xs font-extrabold">
                    {st === 'EMPTY'
                      ? 'PENDING ENTRY'
                      : p.inspection_type === 'VISUAL_PASS_FAIL'
                      ? entry.visual_pass
                        ? 'PASS (GREEN)'
                        : 'FAIL (RED)'
                      : `${entry.measured_numeric_value} ${p.measurement_unit} (${st})`}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 6 Cols: Active Pin Input, Gauge Calibration Selector, GREEN/RED & 2-Photo Trigger */}
        {activePin && (
          <div className="lg:col-span-6 space-y-4">
            <div
              className={`rounded-2xl p-5 border-4 transition ${
                activeStatus === 'GREEN'
                  ? 'bg-emerald-950/50 border-emerald-500'
                  : activeStatus === 'RED'
                  ? 'bg-red-950/70 border-red-500'
                  : activePin.is_ctq
                  ? 'bg-orange-950/30 border-orange-500'
                  : 'bg-slate-900 border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase text-sky-400">
                  ACTIVE CALLOUT: PIN #{activePin.pin_number} OF {pins.length}
                </span>
                {activePin.is_ctq && (
                  <span className="px-2.5 py-1 rounded bg-orange-500 text-slate-950 font-black text-xs">
                    CRITICAL-TO-QUALITY (CTQ — SEC 4.3)
                  </span>
                )}
              </div>

              <h2 className="text-xl font-black text-white mt-1">{activePin.parameter_name}</h2>

              {activePin.inspection_type !== 'VISUAL_PASS_FAIL' && (
                <div className="mt-2 flex flex-wrap gap-3 text-xs font-mono bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                  <span>
                    Target: <strong className="text-white">{Number(activePin.nominal_value).toFixed(2)} {activePin.measurement_unit}</strong>
                  </span>
                  <span>
                    Allowed Range:{' '}
                    <strong className="text-emerald-400">
                      {Number(activePin.min_allowed_limit).toFixed(2)} to {Number(activePin.max_allowed_limit).toFixed(2)} {activePin.measurement_unit}
                    </strong>
                  </span>
                </div>
              )}

              {/* Section 2.3: Mandatory Measuring Gauge Selection & Expiry Verification */}
              {activePin.inspection_type !== 'VISUAL_PASS_FAIL' && (
                <div className="mt-4">
                  <label className="block text-xs font-bold uppercase text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Ruler className="w-4 h-4 text-amber-400" />
                    Select / Scan Measuring Gauge Serial (Required: {activePin.required_gauge_type})
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {gauges.map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => handleSelectGauge(activePin, g.gauge_serial)}
                        className={`px-3 py-2 rounded-xl text-xs font-mono font-bold border transition ${
                          currentEntry.gauge_serial === g.gauge_serial
                            ? 'bg-sky-500 text-slate-950 border-white'
                            : g.is_calibration_expired
                            ? 'bg-red-950/60 border-red-700 text-red-300 hover:bg-red-900'
                            : 'bg-slate-950 border-slate-700 text-slate-300'
                        }`}
                      >
                        {g.gauge_serial} ({g.gauge_type}){' '}
                        {g.is_calibration_expired ? '⚠️ [EXPIRED - TEST LOCK]' : '✓ Valid'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Measurement Input or Visual Toggle */}
              {activePin.inspection_type === 'VISUAL_PASS_FAIL' ? (
                <div className="mt-5 grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() =>
                      setReadings((prev) => ({
                        ...prev,
                        [activePin.id]: { ...prev[activePin.id], visual_pass: true },
                      }))
                    }
                    className={`h-20 rounded-2xl font-black text-lg border-2 ${
                      currentEntry.visual_pass === true
                        ? 'bg-emerald-600 border-white text-white'
                        : 'bg-slate-950 border-slate-700 text-slate-400'
                    }`}
                  >
                    ✓ VISUAL PASS (GREEN)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setReadings((prev) => ({
                        ...prev,
                        [activePin.id]: { ...prev[activePin.id], visual_pass: false },
                      }))
                    }
                    className={`h-20 rounded-2xl font-black text-lg border-2 ${
                      currentEntry.visual_pass === false
                        ? 'bg-red-600 border-white text-white'
                        : 'bg-slate-950 border-slate-700 text-slate-400'
                    }`}
                  >
                    ✕ VISUAL DEFECT (RED)
                  </button>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between bg-slate-950 border-2 border-slate-700 rounded-xl px-4 py-3">
                    <div>
                      <span className="text-[11px] font-mono text-slate-400 block">MEASURED VALUE</span>
                      <span className="text-3xl font-black font-mono text-white">
                        {currentEntry.measured_numeric_value || '0.00'}{' '}
                        <span className="text-base text-slate-400">{activePin.measurement_unit}</span>
                      </span>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`px-3 py-1 rounded-lg font-black text-xs ${
                          activeStatus === 'GREEN'
                            ? 'bg-emerald-500 text-slate-950'
                            : activeStatus === 'RED'
                            ? 'bg-red-500 text-white'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {activeStatus === 'GREEN'
                          ? 'IN TOLERANCE (GREEN)'
                          : activeStatus === 'RED'
                          ? 'OUT OF TOLERANCE (RED)'
                          : 'ENTER VALUE'}
                      </span>
                      <div className="flex gap-1.5 mt-1">
                        <button
                          type="button"
                          onClick={() =>
                            setReadings((prev) => ({
                              ...prev,
                              [activePin.id]: {
                                ...prev[activePin.id],
                                measured_numeric_value: String(Number(activePin.nominal_value).toFixed(2)),
                              },
                            }))
                          }
                          className="text-[11px] bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 px-2 py-0.5 rounded border border-emerald-600"
                        >
                          Quick Fill In-Spec ({Number(activePin.nominal_value).toFixed(2)})
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setReadings((prev) => ({
                              ...prev,
                              [activePin.id]: {
                                ...prev[activePin.id],
                                measured_numeric_value: String((Number(activePin.nominal_value) + 0.85).toFixed(2)),
                              },
                            }))
                          }
                          className="text-[11px] bg-red-900/60 hover:bg-red-800 text-red-200 px-2 py-0.5 rounded border border-red-600"
                        >
                          Quick Fill Out-of-Spec ({(Number(activePin.nominal_value) + 0.85).toFixed(2)})
                        </button>
                      </div>
                    </div>
                  </div>

                  <GloveNumericKeypad
                    value={String(currentEntry.measured_numeric_value || '')}
                    onChange={(val) =>
                      setReadings((prev) => ({
                        ...prev,
                        [activePin.id]: { ...prev[activePin.id], measured_numeric_value: val },
                      }))
                    }
                    onConfirm={() => {
                      if (activePinIndex < pins.length - 1) {
                        setActivePinIndex(activePinIndex + 1);
                      }
                    }}
                  />
                </div>
              )}

              {/* Section 5.4: Mandatory 2-Photo Defect Capture Workflow when RED */}
              {activeStatus === 'RED' && (
                <div className="mt-4 p-4 rounded-xl bg-red-950 border-2 border-red-400 space-y-3">
                  <div className="text-xs font-black uppercase text-red-200 flex items-center gap-2">
                    <Camera className="w-5 h-5 text-red-300" />
                    Section 5.4 Mandatory Lock: Capture 2 Clear Defect / Gauge Photos to Proceed
                  </div>
                  {activePin.is_ctq && (
                    <div className="p-2.5 rounded-lg bg-orange-500 text-slate-950 font-black text-xs">
                      🚨 CTQ FAILURE DETECTED (Section 4.3): Submitting this checklist will FREEZE the lot in
                      Quarantine, BLOCK Supervisor Concessions, and alert the Quality Head!
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => handleCaptureDefectPhoto(activePin.id, 1)}
                      className={`p-3 rounded-xl font-bold text-xs flex flex-col items-center justify-center gap-1 border-2 ${
                        currentEntry.defect_photo_1_url
                          ? 'bg-emerald-900/60 border-emerald-400 text-emerald-200'
                          : 'bg-slate-900 border-red-400 text-white'
                      }`}
                    >
                      <Camera className="w-5 h-5" />
                      {currentEntry.defect_photo_1_url ? '✓ Photo #1 Captured' : 'Tap to Capture Defect Photo #1'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCaptureDefectPhoto(activePin.id, 2)}
                      className={`p-3 rounded-xl font-bold text-xs flex flex-col items-center justify-center gap-1 border-2 ${
                        currentEntry.defect_photo_2_url
                          ? 'bg-emerald-900/60 border-emerald-400 text-emerald-200'
                          : 'bg-slate-900 border-red-400 text-white'
                      }`}
                    >
                      <Camera className="w-5 h-5" />
                      {currentEntry.defect_photo_2_url ? '✓ Photo #2 Captured' : 'Tap to Capture Gauge Photo #2'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Final Submit Button */}
            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmitChecklist}
              className="w-full py-4 rounded-2xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-base flex items-center justify-center gap-2 shadow-xl transition"
            >
              <Send className="w-5 h-5" />
              {submitting ? 'Submitting & Locking Audit Record...' : 'Complete & Submit Locked PDI Checklist'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}