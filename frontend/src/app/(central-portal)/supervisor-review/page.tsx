'use client';

import React, { useEffect, useState } from 'react';
import apiClient from '@/services/apiClient';
import {
  CheckCircle2,
  ShieldAlert,
  AlertTriangle,
  FileWarning,
  Wrench,
  Trash2,
  Undo2,
  FileSignature,
} from 'lucide-react';

export default function SupervisorReviewPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState<any | null>(null);
  const [concessionCode, setConcessionCode] = useState('MINOR-SURFACE-DEV-01');
  const [justification, setJustification] = useState('');
  const [mrbAction, setMrbAction] = useState('REWORK_ORDER');
  const [mrbDirective, setMrbDirective] = useState('');
  const [scrapCode, setScrapCode] = useState('SCR-MACH-4140');
  const [customerApprovalRef, setCustomerApprovalRef] = useState('');
  const [banner, setBanner] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const fetchSessions = async (keepId?: string) => {
    try {
      const res = await apiClient.get('/quality/sessions/');
      setSessions(res.data);
      if (res.data.length > 0) {
        const found = keepId ? res.data.find((s: any) => s.id === keepId) : res.data[0];
        setSelectedSession(found || res.data[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleSupervisorDecision = async (decision: 'APPROVE' | 'CONCESSION' | 'REJECT_QUARANTINE') => {
    if (!selectedSession) return;
    setBanner(null);
    try {
      const res = await apiClient.post(`/quality/sessions/${selectedSession.id}/supervisor_review/`, {
        decision,
        concession_reason_code: concessionCode,
        concession_engineering_justification: justification,
      });
      setBanner({
        type: 'ok',
        text: `Supervisor Decision Recorded: ${res.data.approval_status} for ${res.data.session_code}`,
      });
      await fetchSessions(selectedSession.id);
    } catch (err: any) {
      setBanner({
        type: 'err',
        text: err?.response?.data?.message || 'Action blocked by CTQ or Concession safeguard.',
      });
    }
  };

  const handleExecuteMRB = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSession) return;
    setBanner(null);
    try {
      const res = await apiClient.post(`/quality/sessions/${selectedSession.id}/mrb_disposition/`, {
        disposition_action: mrbAction,
        engineering_directive: mrbDirective || 'Execute corrective CNC polishing & re-verify PDI.',
        scrap_cost_code: scrapCode,
        customer_written_approval_ref: customerApprovalRef,
      });
      setBanner({
        type: 'ok',
        text: `MRB Disposition Executed (${res.data.mrb_code}): ${res.data.disposition_action}`,
      });
      await fetchSessions(selectedSession.id);
    } catch (err: any) {
      setBanner({
        type: 'err',
        text: err?.response?.data?.message || 'MRB disposition failed.',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <span className="text-xs font-mono uppercase text-amber-400 font-bold">
          SECTION 6.1 & 6.3 • SUPERVISOR APPROVALS, CONCESSIONS & MRB QUARANTINE
        </span>
        <h1 className="text-2xl font-extrabold text-white mt-0.5">
          Shift Supervisor Review Queue & Digital Rejection Holding Area (MRB)
        </h1>
      </div>

      {banner && (
        <div
          className={`p-4 rounded-xl border text-xs font-bold ${
            banner.type === 'ok'
              ? 'bg-emerald-950/70 border-emerald-600 text-emerald-200'
              : 'bg-red-950/80 border-red-500 text-red-200'
          }`}
        >
          {banner.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 5 Cols: Submitted Checklists Queue */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Submitted Floor Inspection Checklists ({sessions.length})
          </h2>

          {sessions.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 bg-slate-950 rounded-xl border border-slate-800">
              No inspection checklists submitted yet. Go to Tablet Mode to submit an inspection.
            </div>
          ) : (
            <div className="space-y-2.5">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  onClick={() => setSelectedSession(s)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition text-xs ${
                    selectedSession?.id === s.id
                      ? 'bg-sky-950/60 border-sky-400 ring-1 ring-sky-400'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-white font-mono">{s.session_code}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                        s.approval_status === 'APPROVED'
                          ? 'bg-emerald-600 text-white'
                          : s.approval_status === 'CONCESSION_RELEASED'
                          ? 'bg-sky-600 text-white'
                          : s.approval_status === 'QUARANTINED_MRB'
                          ? 'bg-red-600 text-white'
                          : 'bg-amber-500 text-slate-950'
                      }`}
                    >
                      {s.approval_status}
                    </span>
                  </div>
                  <div className="mt-1.5 text-slate-300">
                    Traveler: <strong>{s.traveler_barcode}</strong> | Part: {s.part_number}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400 flex items-center justify-between">
                    <span>Inspector: {s.inspector_name}</span>
                    <span>Result: {s.overall_result}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right 7 Cols: Detailed Inspection Review, Concession & MRB Disposition */}
        <div className="lg:col-span-7 space-y-6">
          {selectedSession ? (
            <>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-base font-extrabold text-white">
                      Checklist {selectedSession.session_code} ({selectedSession.traveler_barcode})
                    </h3>
                    <p className="text-xs text-slate-400 font-mono">
                      Station: {selectedSession.station_code} | Serial: {selectedSession.serial_number}
                    </p>
                  </div>
                  {selectedSession.has_ctq_failure && (
                    <span className="bg-red-600 text-white text-xs font-black px-3 py-1 rounded-lg animate-pulse">
                      🚨 CTQ FAILURE — CONCESSION BLOCKED
                    </span>
                  )}
                </div>

                {/* Measurements Table & Defect Photos */}
                <div className="space-y-3">
                  {selectedSession.measurements?.map((m: any) => (
                    <div
                      key={m.id}
                      className={`p-3.5 rounded-xl border text-xs ${
                        m.is_within_tolerance
                          ? 'bg-emerald-950/20 border-emerald-800/60'
                          : 'bg-red-950/40 border-red-600'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span className="text-white">
                          Pin #{m.pin_number}: {m.parameter_name}{' '}
                          {m.is_ctq && <span className="text-orange-400 font-mono">[CTQ]</span>}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded font-mono ${
                            m.is_within_tolerance ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
                          }`}
                        >
                          {m.measured_numeric_value !== null
                            ? `${m.measured_numeric_value} mm`
                            : m.visual_pass
                            ? 'VISUAL PASS'
                            : 'VISUAL FAIL'}{' '}
                          ({m.indicator_color})
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-1">
                        Calibrated Gauge Used: {m.gauge_serial || 'VISUAL'}
                      </div>

                      {!m.is_within_tolerance && (
                        <div className="mt-3 grid grid-cols-2 gap-3">
                          {m.defect_photo_1_url && (
                            <img
                              src={m.defect_photo_1_url}
                              alt="Defect Evidence 1"
                              className="rounded-lg border border-red-500 h-28 w-full object-cover"
                            />
                          )}
                          {m.defect_photo_2_url && (
                            <img
                              src={m.defect_photo_2_url}
                              alt="Defect Evidence 2"
                              className="rounded-lg border border-red-500 h-28 w-full object-cover"
                            />
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Supervisor Action Options (Section 6.1) */}
                <div className="pt-4 border-t border-slate-800 space-y-3">
                  <h4 className="text-xs font-bold uppercase text-sky-400">
                    Section 6.1: Shift Supervisor Decision & Conditional Concession
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-400 mb-1">Concession Reason Code</label>
                      <input
                        type="text"
                        value={concessionCode}
                        onChange={(e) => setConcessionCode(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">
                        Mandatory Engineering Justification (for Concession/Quarantine)
                      </label>
                      <input
                        type="text"
                        placeholder="Enter engineering justification..."
                        value={justification}
                        onChange={(e) => setJustification(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 pt-2">
                    <button
                      onClick={() => handleSupervisorDecision('APPROVE')}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs py-3 px-4 rounded-xl transition"
                    >
                      ✓ Approve Lot for Next Process / Dispatch
                    </button>
                    <button
                      onClick={() => handleSupervisorDecision('CONCESSION')}
                      className="flex-1 bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs py-3 px-4 rounded-xl transition"
                    >
                      ⚠ Issue Conditional Concession (Non-CTQ Only)
                    </button>
                    <button
                      onClick={() => handleSupervisorDecision('REJECT_QUARANTINE')}
                      className="flex-1 bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs py-3 px-4 rounded-xl transition"
                    >
                      🔒 Reject to Quarantine Holding Area
                    </button>
                  </div>
                </div>
              </div>

              {/* Section 6.3: Material Review Board (MRB) Disposition Panel */}
              <form
                onSubmit={handleExecuteMRB}
                className="bg-slate-900 border-2 border-amber-700/60 rounded-2xl p-5 space-y-4 text-xs"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold uppercase text-amber-400 flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5" />
                    Section 6.3: Material Review Board (MRB) Disposition Options
                  </h3>
                  <span className="text-[11px] font-mono text-slate-400">
                    Plant Manager / Quality Head / Production Lead
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'REWORK_ORDER', label: '1. Rework Order', icon: Wrench },
                    { id: 'SCRAP_DISPOSITION', label: '2. Scrap Write-Off', icon: Trash2 },
                    { id: 'RETURN_TO_VENDOR', label: '3. Return to Vendor', icon: Undo2 },
                    { id: 'CUSTOMER_SPECIAL_CONCESSION', label: '4. Customer Concession', icon: FileSignature },
                  ].map((opt) => {
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setMrbAction(opt.id)}
                        className={`p-3 rounded-xl border font-bold flex flex-col items-center gap-1.5 transition ${
                          mrbAction === opt.id
                            ? 'bg-amber-500 text-slate-950 border-white'
                            : 'bg-slate-950 text-slate-300 border-slate-800'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">
                    MRB Corrective Routing / Disposition Directive
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Route to CNC Lathe #04 for 0.03mm OD polishing rework"
                    value={mrbDirective}
                    onChange={(e) => setMrbDirective(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-white"
                  />
                </div>

                {mrbAction === 'CUSTOMER_SPECIAL_CONCESSION' && (
                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold">
                      Customer Written Approval Reference
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., CUST-WAIVER-BF-2026-99"
                      value={customerApprovalRef}
                      onChange={(e) => setCustomerApprovalRef(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-3 rounded-xl transition"
                >
                  Execute Official MRB Disposition →
                </button>
              </form>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}