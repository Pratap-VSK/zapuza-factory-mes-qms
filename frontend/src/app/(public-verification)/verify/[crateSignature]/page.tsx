'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import apiClient from '@/services/apiClient';
import { ShieldCheck, CheckCircle2, FileCheck } from 'lucide-react';

export default function PublicCustomerVerifyPage() {
  const { crateSignature } = useParams() as { crateSignature: string };
  const [data, setData] = useState<any | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const verify = async () => {
      try {
        const decoded = decodeURIComponent(crateSignature);
        const res = await apiClient.get(`/dispatch/manifests/public_verify_coa/?token=${encodeURIComponent(decoded)}`);
        setData(res.data);
      } catch (err: any) {
        setError(err?.response?.data?.error || 'Invalid or unrecognized Customer Crate QR Code.');
      }
    };
    verify();
  }, [crateSignature]);

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 text-red-400 flex items-center justify-center p-6 font-mono">
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-300 flex items-center justify-center p-6 font-mono">
        Verifying Cryptographic Crate Signature & Loading Certified Digital CoA...
      </div>
    );
  }

  const { manifest, digital_coa_certificate: coa } = data;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10">
      <div className="max-w-4xl mx-auto bg-slate-900 border-2 border-emerald-600 rounded-2xl p-8 space-y-6 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono font-bold">
              <ShieldCheck className="w-5 h-5" />
              ZAPUZA TECHNOLOGIES LLP • CERTIFIED DIGITAL CERTIFICATE OF ANALYSIS (CoA)
            </div>
            <h1 className="text-2xl font-black text-white mt-1">
              Shipment Manifest: {manifest.manifest_number} | Gate Pass: {manifest.gate_pass_number}
            </h1>
          </div>
          <span className="bg-emerald-600 text-white font-black text-xs px-4 py-2 rounded-xl">
            ✓ AUTHENTICATED & 100% QC VERIFIED
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono">
          <div>
            <span className="text-slate-400 block">Customer Name</span>
            <strong className="text-white">{manifest.customer_name}</strong>
          </div>
          <div>
            <span className="text-slate-400 block">Customer PO #</span>
            <strong className="text-white">{manifest.customer_po_number}</strong>
          </div>
          <div>
            <span className="text-slate-400 block">Part Number</span>
            <strong className="text-sky-400">{manifest.part_number}</strong>
          </div>
          <div>
            <span className="text-slate-400 block">Raw Steel Heat #</span>
            <strong className="text-emerald-400">{manifest.heat_number}</strong>
          </div>
        </div>

        {/* Certified Chemical & Mechanical MTC Values */}
        <div className="space-y-2 text-xs">
          <h2 className="font-bold uppercase text-amber-400">
            1. Supplier Mill Test Certificate (MTC) & Chemical/Mechanical Properties
          </h2>
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>MTC Ref: {coa.raw_material_origin.mtc_reference_number}</div>
            <div>Carbon (C): {coa.raw_material_origin.carbon_percentage}%</div>
            <div>Manganese (Mn): {coa.raw_material_origin.manganese_percentage}%</div>
            <div>Yield Strength: {coa.raw_material_origin.yield_strength_mpa} MPa</div>
            <div>Tensile Strength: {coa.raw_material_origin.tensile_strength_mpa} MPa</div>
            <div>Hardness: {coa.raw_material_origin.hardness_hb} HB</div>
          </div>
        </div>

        {/* Actual Measured PDI Values */}
        <div className="space-y-2 text-xs">
          <h2 className="font-bold uppercase text-sky-400">
            2. Final Pre-Dispatch Inspection (PDI) Measured Dimensions & Gauge Calibration
          </h2>
          {coa.quality_inspection_records.map((insp: any) => (
            <div key={insp.session_code} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="font-bold text-white flex justify-between">
                <span>Checklist: {insp.session_code}</span>
                <span className="text-emerald-400">{insp.approval_status}</span>
              </div>
              <div className="divide-y divide-slate-800">
                {insp.measurements.map((m: any) => (
                  <div key={m.pin_number} className="py-2 flex items-center justify-between font-mono">
                    <span>
                      Pin #{m.pin_number}: {m.parameter_name} (Spec: {m.nominal} {m.unit})
                    </span>
                    <span className="text-emerald-400 font-bold">
                      Actual: {m.measured_value} {m.unit} [Gauge: {m.gauge_serial}]
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}