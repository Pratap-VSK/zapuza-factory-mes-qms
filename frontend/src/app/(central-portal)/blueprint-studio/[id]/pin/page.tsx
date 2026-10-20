'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import apiClient from '@/services/apiClient';
import {
  MapPin,
  AlertTriangle,
  Lock,
  PlusCircle,
  CheckCircle2,
  Trash2,
  ArrowLeft,
  ShieldCheck,
} from 'lucide-react';

export default function InteractiveBlueprintPinningPage() {
  const params = useParams();
  const router = useRouter();
  const templateId = params?.id as string;

  const [template, setTemplate] = useState<any>(null);
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [newPinCoords, setNewPinCoords] = useState<{ x: number; y: number } | null>(null);
  const [formState, setFormState] = useState({
    pin_number: 4,
    parameter_name: '',
    inspection_type: 'DIMENSIONAL_TOLERANCE',
    nominal_value: '25.00',
    upper_tolerance: '0.05',
    lower_tolerance: '-0.02',
    measurement_unit: 'mm',
    required_gauge_type: 'VERNIER_CALIPER',
    is_ctq: false,
  });
  const [errorMsg, setErrorMsg] = useState('');
  const canvasRef = useRef<HTMLDivElement>(null);

  const fetchTemplate = async () => {
    try {
      const res = await apiClient.get(`/pdi-templates/templates/${templateId}/`);
      setTemplate(res.data);
      const nextNum = (res.data.pins?.length || 0) + 1;
      setFormState((prev) => ({ ...prev, pin_number: nextNum }));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (templateId) fetchTemplate();
  }, [templateId]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current || !template) return;
    if (template.is_locked_for_editing) {
      setErrorMsg(
        `Revision Safeguard (Section 4.1): Template ${template.revision_number} is already deployed to production and locked. Clone 'Rev B' from the previous screen to add or modify pins.`
      );
      return;
    }
    const rect = canvasRef.current.getBoundingClientRect();
    const xPercent = Number((((e.clientX - rect.left) / rect.width) * 100).toFixed(2));
    const yPercent = Number((((e.clientY - rect.top) / rect.height) * 100).toFixed(2));
    setNewPinCoords({ x: xPercent, y: yPercent });
    setErrorMsg('');
  };

  const handleSaveNewPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPinCoords) return;
    setErrorMsg('');
    try {
      await apiClient.post('/pdi-templates/pins/', {
        template: template.id,
        pin_number: Number(formState.pin_number),
        parameter_name: formState.parameter_name,
        x_coord_percent: newPinCoords.x,
        y_coord_percent: newPinCoords.y,
        inspection_type: formState.inspection_type,
        nominal_value: formState.inspection_type === 'VISUAL_PASS_FAIL' ? null : formState.nominal_value,
        upper_tolerance: formState.inspection_type === 'DIMENSIONAL_TOLERANCE' ? formState.upper_tolerance : null,
        lower_tolerance: formState.inspection_type === 'DIMENSIONAL_TOLERANCE' ? formState.lower_tolerance : null,
        measurement_unit: formState.measurement_unit,
        required_gauge_type: formState.required_gauge_type,
        is_ctq: formState.is_ctq,
      });
      setNewPinCoords(null);
      setFormState((prev) => ({ ...prev, parameter_name: '', is_ctq: false }));
      fetchTemplate();
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || JSON.stringify(err?.response?.data) || 'Error saving pin');
    }
  };

  const handleDeletePin = async (pinId: string) => {
    try {
      await apiClient.delete(`/pdi-templates/pins/${pinId}/`);
      fetchTemplate();
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || 'Cannot delete pin on locked template.');
    }
  };

  if (!template) {
    return <div className="text-slate-400 font-mono text-sm">Loading Blueprint Canvas...</div>;
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/blueprint-studio')}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-sky-400">{template.template_code}</span>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-700">
                {template.revision_number}
              </span>
              {template.is_locked_for_editing && (
                <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Deployed & Locked
                </span>
              )}
            </div>
            <h1 className="text-xl font-extrabold text-white mt-0.5">{template.title}</h1>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-amber-950/90 border border-amber-600 text-amber-200 text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Cols: Interactive Engineering Blueprint Canvas */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>
              {template.is_locked_for_editing
                ? '🔒 Click any numbered pin below to highlight its tolerance specification.'
                : '🎯 Click anywhere on the blueprint drawing below to drop a new inspection callout pin!'}
            </span>
            <span className="text-orange-400 font-bold">Orange Pin = Critical-to-Quality (CTQ)</span>
          </div>

          <div
            ref={canvasRef}
            onClick={handleCanvasClick}
            className="relative w-full aspect-[2/1] bg-[#0a192f] border-2 border-sky-500/40 rounded-xl overflow-hidden cursor-crosshair shadow-2xl select-none"
          >
            <img
              src={template.blueprint_image_url || '/blueprint-shaft-cad.svg'}
              alt="Engineering Blueprint"
              className="w-full h-full object-contain pointer-events-none"
            />

            {/* Existing Saved Pins */}
            {template.pins?.map((pin: any) => {
              const isSelected = selectedPinId === pin.id;
              return (
                <button
                  key={pin.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPinId(pin.id);
                  }}
                  style={{
                    left: `${pin.x_coord_percent}%`,
                    top: `${pin.y_coord_percent}%`,
                  }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full font-extrabold text-xs flex items-center justify-center transition transform shadow-lg border-2 ${
                    pin.is_ctq
                      ? 'bg-orange-500 text-slate-950 border-white ring-4 ring-orange-500/40'
                      : 'bg-sky-500 text-slate-950 border-white ring-4 ring-sky-500/30'
                  } ${isSelected ? 'scale-125 z-20' : 'hover:scale-110 z-10'}`}
                  title={`Pin #${pin.pin_number}: ${pin.parameter_name}`}
                >
                  #{pin.pin_number}
                </button>
              );
            })}

            {/* Unsaved New Pin Marker */}
            {newPinCoords && (
              <div
                style={{ left: `${newPinCoords.x}%`, top: `${newPinCoords.y}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center border-2 border-white animate-bounce z-30"
              >
                NEW
              </div>
            )}
          </div>
        </div>

        {/* Right 5 Cols: Pin List & Add Pin Studio Form */}
        <div className="lg:col-span-5 space-y-4">
          {newPinCoords && !template.is_locked_for_editing && (
            <form
              onSubmit={handleSaveNewPin}
              className="bg-slate-900 border-2 border-emerald-500/60 rounded-xl p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
                  <PlusCircle className="w-4 h-4" />
                  Configure New Blueprint Pin (X: {newPinCoords.x}%, Y: {newPinCoords.y}%)
                </h3>
                <button
                  type="button"
                  onClick={() => setNewPinCoords(null)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] text-slate-400">Pin #</label>
                  <input
                    type="number"
                    required
                    value={formState.pin_number}
                    onChange={(e) => setFormState({ ...formState, pin_number: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-[11px] text-slate-400">Parameter Callout Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Keyway Width / Runout"
                    value={formState.parameter_name}
                    onChange={(e) => setFormState({ ...formState, parameter_name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-slate-400">Inspection Type</label>
                  <select
                    value={formState.inspection_type}
                    onChange={(e) => setFormState({ ...formState, inspection_type: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-xs"
                  >
                    <option value="DIMENSIONAL_TOLERANCE">Dimension (+/- Tolerance)</option>
                    <option value="MAX_THRESHOLD">Maximum Threshold (MAX)</option>
                    <option value="VISUAL_PASS_FAIL">Visual Pass/Fail (Yes/No)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-slate-400">Required Measuring Tool</label>
                  <select
                    value={formState.required_gauge_type}
                    onChange={(e) => setFormState({ ...formState, required_gauge_type: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-xs"
                  >
                    <option value="VERNIER_CALIPER">Vernier Caliper</option>
                    <option value="MICROMETER">Micrometer</option>
                    <option value="THREAD_PLUG_GAUGE">Thread Plug Gauge</option>
                    <option value="ROUGHNESS_TESTER">Surface Roughness Tester</option>
                  </select>
                </div>
              </div>

              {formState.inspection_type !== 'VISUAL_PASS_FAIL' && (
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-400">Target / Nominal</label>
                    <input
                      type="number"
                      step="0.001"
                      value={formState.nominal_value}
                      onChange={(e) => setFormState({ ...formState, nominal_value: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400">Upper Tol (+)</label>
                    <input
                      type="number"
                      step="0.001"
                      value={formState.upper_tolerance}
                      onChange={(e) => setFormState({ ...formState, upper_tolerance: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400">Lower Tol (-)</label>
                    <input
                      type="number"
                      step="0.001"
                      value={formState.lower_tolerance}
                      onChange={(e) => setFormState({ ...formState, lower_tolerance: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-xs"
                    />
                  </div>
                </div>
              )}

              <label className="flex items-center gap-2 p-2.5 rounded-lg bg-orange-950/40 border border-orange-700/60 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formState.is_ctq}
                  onChange={(e) => setFormState({ ...formState, is_ctq: e.target.checked })}
                  className="w-4 h-4 accent-orange-500"
                />
                <span className="text-xs font-bold text-orange-300">
                  Flag as CTQ (Critical-to-Quality — Section 4.3: Freezes checklist & blocks concessions on failure)
                </span>
              </label>

              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2.5 rounded-lg transition"
              >
                Save Pin to Blueprint
              </button>
            </form>
          )}

          {/* Configured Pins List */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-bold text-white">
              Pinned Inspection Parameters ({template.pins?.length || 0})
            </h3>
            <div className="space-y-2.5 max-h-[450px] overflow-y-auto pr-1">
              {template.pins?.map((pin: any) => {
                const isSelected = selectedPinId === pin.id;
                return (
                  <div
                    key={pin.id}
                    onClick={() => setSelectedPinId(pin.id)}
                    className={`p-3.5 rounded-xl border transition cursor-pointer ${
                      isSelected
                        ? 'bg-sky-950/50 border-sky-400 ring-2 ring-sky-500/30'
                        : pin.is_ctq
                        ? 'bg-orange-950/20 border-orange-700/60'
                        : 'bg-slate-950 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-6 h-6 rounded-full text-xs font-extrabold flex items-center justify-center ${
                            pin.is_ctq ? 'bg-orange-500 text-slate-950' : 'bg-sky-500 text-slate-950'
                          }`}
                        >
                          #{pin.pin_number}
                        </span>
                        <span className="font-bold text-sm text-white">{pin.parameter_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {pin.is_ctq && (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-orange-500 text-slate-950">
                            CTQ PRIORITY
                          </span>
                        )}
                        {!template.is_locked_for_editing && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletePin(pin.id);
                            }}
                            className="text-slate-500 hover:text-red-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-300 font-mono">
                      <div>
                        Spec:{' '}
                        {pin.inspection_type === 'VISUAL_PASS_FAIL' ? (
                          <span className="text-emerald-400">Visual Yes/No</span>
                        ) : (
                          <span className="text-sky-300">
                            {Number(pin.nominal_value).toFixed(2)} ({Number(pin.min_allowed_limit).toFixed(2)} to{' '}
                            {Number(pin.max_allowed_limit).toFixed(2)} {pin.measurement_unit})
                          </span>
                        )}
                      </div>
                      <div>
                        Tool: <span className="text-amber-300">{pin.required_gauge_type}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}