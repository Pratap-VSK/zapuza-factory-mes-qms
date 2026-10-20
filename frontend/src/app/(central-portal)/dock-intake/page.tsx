'use client';

import React, { useEffect, useState } from 'react';
import apiClient from '@/services/apiClient';
import { PackageCheck, ShieldAlert, CheckCircle2, Barcode } from 'lucide-react';

export default function DockIntakePage() {
  const [lots, setLots] = useState<any[]>([]);
  const [lotNumber, setLotNumber] = useState(`RM-LOT-2026-00${Math.floor(Math.random() * 90 + 10)}`);
  const [supplier, setSupplier] = useState('Kalyani Steels Ltd.');
  const [poNumber, setPoNumber] = useState('PO-STEEL-9981');
  const [grade, setGrade] = useState('AISI 4140');
  const [heatNumber, setHeatNumber] = useState('H-8099');
  const [qty, setQty] = useState('1500');
  const [mtcRef, setMtcRef] = useState('MTC-KSL-8099');

  const loadLots = async () => {
    const res = await apiClient.get('/material-intake/lots/');
    setLots(res.data);
  };

  useEffect(() => {
    loadLots();
  }, []);

  const handleCreateIntake = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiClient.post('/material-intake/lots/', {
      lot_tracking_number: lotNumber,
      supplier_name: supplier,
      purchase_order_number: poNumber,
      material_grade: grade,
      heat_number: heatNumber,
      quantity_received: qty,
      mtc_reference_number: mtcRef,
      carbon_percentage: '0.415',
      manganese_percentage: '0.890',
      silicon_percentage: '0.250',
      requires_spectro_lab_test: true,
      spectro_lab_passed: true,
      physical_dimensions_ok: true,
    });
    await loadLots();
  };

  const handleApprove = async (id: string) => {
    await apiClient.post(`/material-intake/lots/${id}/approve_lot/`, { spectro_lab_passed: true });
    await loadLots();
  };

  const handleRejectQuarantine = async (id: string) => {
    await apiClient.post(`/material-intake/lots/${id}/reject_intake/`, {
      failure_category: 'SPECTRO_CHEMICAL_MISMATCH',
      detailed_reason: 'Rejected at Dock / Spectro Lab check — Locked in Supplier Quarantine (SNCR).',
    });
    await loadLots();
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <span className="text-xs font-mono uppercase text-sky-400 font-bold">
          SECTION 3 • RAW MATERIAL DOCK INTAKE, MTC VERIFICATION & SUPPLIER QUARANTINE
        </span>
        <h1 className="text-2xl font-extrabold text-white mt-0.5">
          Raw Material Heat Lot Receiving, Spectro Lab & SNCR Quarantine
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <form
          onSubmit={handleCreateIntake}
          className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 text-xs"
        >
          <h2 className="text-sm font-bold uppercase text-sky-400">Log New Dock Material Intake</h2>
          <div>
            <label className="block text-slate-400 mb-1">Lot Tracking #</label>
            <input
              value={lotNumber}
              onChange={(e) => setLotNumber(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
            />
          </div>
          <div>
            <label className="block text-slate-400 mb-1">Supplier Name</label>
            <input
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-400 mb-1">Heat Number</label>
              <input
                value={heatNumber}
                onChange={(e) => setHeatNumber(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-emerald-400 font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Material Grade</label>
              <input
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
              />
            </div>
          </div>
          <div>
            <label className="block text-slate-400 mb-1">Mandatory Supplier MTC Reference #</label>
            <input
              required
              value={mtcRef}
              onChange={(e) => setMtcRef(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-sky-600 hover:bg-sky-500 text-white font-extrabold py-3 rounded-xl transition"
          >
            Record Dock Intake & Send to Lab →
          </button>
        </form>

        <div className="lg:col-span-8 space-y-3">
          {lots.map((lot) => (
            <div
              key={lot.id}
              className={`p-4 rounded-2xl border text-xs ${
                lot.status === 'SUPPLIER_QUARANTINE'
                  ? 'bg-red-950/30 border-red-600'
                  : 'bg-slate-900 border-slate-800'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-bold text-sm text-white">
                  {lot.lot_tracking_number} • Heat: <span className="text-emerald-400">{lot.heat_number}</span> ({lot.material_grade})
                </div>
                <span
                  className={`px-3 py-1 rounded-full font-extrabold ${
                    lot.status === 'APPROVED_STOCK'
                      ? 'bg-emerald-600 text-white'
                      : lot.status === 'SUPPLIER_QUARANTINE'
                      ? 'bg-red-600 text-white'
                      : 'bg-amber-500 text-slate-950'
                  }`}
                >
                  {lot.status}
                </span>
              </div>
              <div className="text-slate-400 font-mono mt-1">
                Supplier: {lot.supplier_name} | PO: {lot.purchase_order_number} | MTC: {lot.mtc_reference_number}
              </div>
              {lot.sncr_report && (
                <div className="mt-2 p-2.5 rounded-lg bg-red-950 border border-red-700 text-red-200 font-mono">
                  🚨 {lot.sncr_report.sncr_number}: {lot.sncr_report.detailed_reason}
                </div>
              )}
              <div className="mt-3 flex gap-2">
                {lot.status !== 'APPROVED_STOCK' && lot.status !== 'SUPPLIER_QUARANTINE' && (
                  <button
                    onClick={() => handleApprove(lot.id)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3.5 py-2 rounded-lg"
                  >
                    ✓ Clear Lab & Print Bundle Barcode
                  </button>
                )}
                {lot.status !== 'SUPPLIER_QUARANTINE' && (
                  <button
                    onClick={() => handleRejectQuarantine(lot.id)}
                    className="bg-red-600 hover:bg-red-500 text-white font-bold px-3.5 py-2 rounded-lg"
                  >
                    ✕ Reject Intake → Supplier Quarantine (SNCR)
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}