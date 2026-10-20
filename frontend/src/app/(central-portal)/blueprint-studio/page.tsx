'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import apiClient from '@/services/apiClient';
import { FileSpreadsheet, CheckCircle2, Lock, Plus, ArrowRight, ShieldCheck, Copy } from 'lucide-react';

export default function BlueprintStudioListPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/pdi-templates/templates/');
      setTemplates(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleCloneRevision = async (id: string, nextRev: string) => {
    try {
      await apiClient.post(`/pdi-templates/templates/${id}/create_revision/`, {
        revision_number: nextRev,
      });
      setMsg(`Created new engineering revision ${nextRev} in DRAFT mode for editing.`);
      fetchTemplates();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to clone revision.');
    }
  };

  const handleApproveDeployment = async (id: string) => {
    try {
      await apiClient.post(`/pdi-templates/templates/${id}/approve_deployment/`);
      setMsg('Template approved by Quality Manager and deployed to active shopfloor tablets!');
      fetchTemplates();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Only Quality Manager can approve templates.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <span className="text-xs font-mono uppercase text-sky-400 font-bold">
            BRD Section 4.1 & 4.3 • Central Template Design Studio
          </span>
          <h1 className="text-2xl font-extrabold text-white mt-1">
            PDI Checklist Templates & Interactive Blueprint Pinning
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Strict revision control (Rev A, Rev B). Once deployed to active production, templates are locked from editing.
          </p>
        </div>
      </div>

      {msg && (
        <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-600 text-emerald-200 text-xs font-semibold flex items-center justify-between">
          <span>{msg}</span>
          <button onClick={() => setMsg('')} className="text-emerald-400 underline ml-4">Dismiss</button>
        </div>
      )}

      {loading ? (
        <div className="text-sm text-slate-400 font-mono">Loading Blueprint Templates...</div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {templates.map((tpl) => (
            <div
              key={tpl.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="font-mono text-xs font-bold px-2.5 py-1 rounded bg-sky-950 text-sky-300 border border-sky-700">
                    {tpl.template_code}
                  </span>
                  <span className="font-mono text-xs font-extrabold px-2.5 py-1 rounded bg-amber-950 text-amber-300 border border-amber-700">
                    {tpl.revision_number}
                  </span>
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded flex items-center gap-1 ${
                      tpl.status === 'APPROVED_ACTIVE'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}
                  >
                    {tpl.status === 'APPROVED_ACTIVE' ? (
                      <>
                        <Lock className="w-3 h-3" /> {tpl.status} (Locked in Production)
                      </>
                    ) : (
                      tpl.status
                    )}
                  </span>
                </div>

                <h2 className="text-lg font-bold text-white">{tpl.title}</h2>
                <div className="text-xs text-slate-400 flex flex-wrap gap-4">
                  <span>Part: <strong className="text-slate-200">{tpl.part_number} ({tpl.part_name})</strong></span>
                  <span>Operation: <strong className="text-slate-200">{tpl.operation_step_code}</strong></span>
                  <span>Configured Pins: <strong className="text-sky-400">{tpl.pins?.length || 0} Callout Pins</strong></span>
                  <span>CTQ Priorities: <strong className="text-orange-400">{tpl.pins?.filter((p: any) => p.is_ctq).length || 0} CTQ</strong></span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <Link
                  href={`/blueprint-studio/${tpl.id}/pin`}
                  className="bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold px-4 py-2.5 rounded-lg flex items-center gap-2 transition"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Open Interactive Blueprint Studio
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>

                {tpl.status !== 'APPROVED_ACTIVE' && (
                  <button
                    onClick={() => handleApproveDeployment(tpl.id)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3.5 py-2.5 rounded-lg flex items-center gap-1.5 transition"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    QM Approve & Deploy
                  </button>
                )}

                <button
                  onClick={() => handleCloneRevision(tpl.id, tpl.revision_number === 'Rev A' ? 'Rev B' : 'Rev C')}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold px-3.5 py-2.5 rounded-lg flex items-center gap-1.5 transition"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Clone New Revision (Rev B)
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}