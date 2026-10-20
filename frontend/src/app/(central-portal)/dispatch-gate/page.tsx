'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import apiClient from '@/services/apiClient';
import { QRCodeSVG } from 'qrcode.react';
import { Truck, Lock, Unlock, CheckCircle2, XCircle, QrCode, ExternalLink } from 'lucide-react';

export default function DispatchGatePage() {
  const [travelers, setTravelers] = useState<any[]>([]);
  const [selectedTravelerId, setSelectedTravelerId] = useState('');
  const [interlockStatus, setInterlockStatus] = useState<any | null>(null);
  const [manifests, setManifests] = useState<any[]>([]);
  const [vehicleNo, setVehicleNo] = useState('MH-12-ZP-2026');
  const [driverPhone, setDriverPhone] = useState('+91-9820012345');
  const [errorMsg, setErrorMsg] = useState('');

  const loadData = async () => {
    try {
      const [trvRes, mnfRes] = await Promise.all([
        apiClient.get('/routing/travelers/'),
        apiClient.get('/dispatch/manifests/'),
      ]);
      setTravelers(trvRes.data);
      setManifests(mnfRes.data);
      if (trvRes.data.length > 0 && !selectedTravelerId) {
        const firstId = trvRes.data[0].id;
        setSelectedTravelerId(firstId);
        checkInterlock(firstId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const checkInterlock = async (travelerId: string) => {
    setErrorMsg('');
    try {
      const res = await apiClient.get(`/dispatch/manifests/check_interlock/?traveler_id=${travelerId}`);
      setInterlockStatus(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleGenerateGatePass = async () => {
    setErrorMsg('');
    try {
      await apiClient.post('/dispatch/manifests/generate_gate_pass/', {
        traveler_id: selectedTravelerId,
        transport_vehicle_number: vehicleNo,
        driver_contact: driverPhone,
      });
      await loadData();
      await checkInterlock(selectedTravelerId);
    } catch (err: any) {
      setErrorMsg(
        err?.response?.data?.message ||
          'Electronic Shipping Interlock Active: Cannot print Gate Pass until all 3 conditions are green!'
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <span className="text-xs font-mono uppercase text-sky-400 font-bold">
          SECTIONS 10 & 11 • PRE-DISPATCH CLEARANCE GATES & CUSTOMER COA QR LABELS
        </span>
        <h1 className="text-2xl font-extrabold text-white mt-0.5">
          Automated 3-Point Shipping Interlock & Printable Customer Crate QR
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 6 Cols: 3-Point Pre-Dispatch Verification Gate */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <label className="block text-xs font-bold uppercase text-slate-400">
            Select Job Traveler Batch for Dispatch Clearance
          </label>
          <select
            value={selectedTravelerId}
            onChange={(e) => {
              setSelectedTravelerId(e.target.value);
              checkInterlock(e.target.value);
            }}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-white"
          >
            {travelers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.traveler_barcode} (SN: {t.serial_number}) — [{t.status}]
              </option>
            ))}
          </select>

          {interlockStatus && (
            <div className="space-y-3 pt-2">
              <div className="text-xs font-bold uppercase text-sky-400">
                Section 10.1: Mandatory 3-Rule Automated Pre-Dispatch Check
              </div>

              {[
                {
                  label: 'Rule A: 100% of required machining & manufacturing operations signed off',
                  passed: interlockStatus.rule_a_100_percent_ops_complete,
                },
                {
                  label: 'Rule B: All process aging & cooling hold-time requirements fulfilled (Zero Quarantine)',
                  passed: interlockStatus.rule_b_all_holds_and_quarantines_clear,
                },
                {
                  label: 'Rule C: Final Pre-Dispatch Inspection (PDI) checklist signed & Approved by Quality',
                  passed: interlockStatus.rule_c_final_pdi_approved,
                },
              ].map((rule, i) => (
                <div
                  key={i}
                  className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-bold ${
                    rule.passed
                      ? 'bg-emerald-950/30 border-emerald-700 text-emerald-200'
                      : 'bg-red-950/40 border-red-600 text-red-200'
                  }`}
                >
                  <span>{rule.label}</span>
                  {rule.passed ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-400 shrink-0" />
                  )}
                </div>
              ))}

              {/* Lockout Warnings */}
              {!interlockStatus.is_unlocked_for_dispatch && (
                <div className="p-4 rounded-xl bg-red-950 border-2 border-red-500 text-xs space-y-1.5">
                  <div className="font-black text-red-200 uppercase flex items-center gap-1.5">
                    <Lock className="w-4 h-4" /> ELECTRONIC SHIPPING INTERLOCK ACTIVE (GATE PASS LOCKED)
                  </div>
                  <ul className="list-disc list-inside text-red-300 space-y-1">
                    {interlockStatus.lockout_warnings?.map((w: string, idx: number) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Transport Vehicle #</label>
                  <input
                    type="text"
                    value={vehicleNo}
                    onChange={(e) => setVehicleNo(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Driver Contact</label>
                  <input
                    type="text"
                    value={driverPhone}
                    onChange={(e) => setDriverPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              {errorMsg && <div className="text-xs text-red-400 font-bold">{errorMsg}</div>}

              <button
                onClick={handleGenerateGatePass}
                disabled={!interlockStatus.is_unlocked_for_dispatch}
                className={`w-full py-4 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition ${
                  interlockStatus.is_unlocked_for_dispatch
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xl'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-red-900'
                }`}
              >
                {interlockStatus.is_unlocked_for_dispatch ? (
                  <>
                    <Unlock className="w-4 h-4" />
                    GENERATE SHIPPING GATE PASS, PACKING SLIP & CUSTOMER QR LABEL
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 text-red-400" />
                    GATE PASS PRINTING STRICTLY LOCKED BY QUALITY INTERLOCK
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Right 6 Cols: Issued Gate Passes & Printable Customer Verification QR Labels */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-2">
            <QrCode className="w-4 h-4" />
            Section 11.2 & 11.3: Printable Customer Crate QR Labels & Digital CoA
          </h2>

          {manifests.length === 0 ? (
            <div className="p-6 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 text-center">
              Once a Traveler passes Final PDI and Supervisor Approval, generate its Gate Pass on the left to print the
              Customer Verification QR Label here.
            </div>
          ) : (
            <div className="space-y-4">
              {manifests.map((m) => {
                const verifyUrl =
                  typeof window !== 'undefined'
                    ? `${window.location.origin}/verify/${encodeURIComponent(m.crate_qr_token)}`
                    : `/verify/${encodeURIComponent(m.crate_qr_token)}`;
                return (
                  <div
                    key={m.id}
                    className="p-4 rounded-2xl bg-slate-950 border-2 border-emerald-600/70 flex flex-col sm:flex-row items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 text-xs">
                      <div className="text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-700 px-2 py-0.5 rounded inline-block font-bold">
                        CLEARED GATE PASS: {m.gate_pass_number}
                      </div>
                      <h3 className="text-base font-black text-white">
                        Manifest: {m.manifest_number} ({m.part_number})
                      </h3>
                      <div className="text-slate-400 font-mono">
                        Customer: {m.customer_name} | PO: {m.customer_po_number} | Qty: {m.shipped_quantity} pcs
                      </div>
                      <div className="text-slate-400 font-mono">
                        Heat Lot: <strong className="text-emerald-400">{m.heat_number}</strong> | Vehicle:{' '}
                        {m.transport_vehicle_number}
                      </div>
                      <div className="pt-2">
                        <Link
                          href={`/verify/${encodeURIComponent(m.crate_qr_token)}`}
                          target="_blank"
                          className="inline-flex items-center gap-1.5 bg-sky-600 hover:bg-sky-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Open Customer Digital CoA Portal →
                        </Link>
                      </div>
                    </div>

                    <div className="bg-white p-3 rounded-xl shrink-0 flex flex-col items-center">
                      <QRCodeSVG value={verifyUrl} size={110} />
                      <span className="text-[9px] font-mono font-bold text-slate-900 mt-1">
                        SCAN FOR DIGITAL CoA
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}