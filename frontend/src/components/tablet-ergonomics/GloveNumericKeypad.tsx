'use client';

import React from 'react';
import { Delete, Check } from 'lucide-react';

interface Props {
  value: string;
  onChange: (val: string) => void;
  onConfirm?: () => void;
}

export default function GloveNumericKeypad({ value, onChange, onConfirm }: Props) {
  const keys = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '.', '0'];

  const handleTap = (k: string) => {
    if (k === '.' && value.includes('.')) return;
    onChange(value + k);
  };

  const handleBackspace = () => {
    onChange(value.slice(0, -1));
  };

  return (
    <div className="bg-slate-900 border-2 border-slate-700 rounded-2xl p-3 space-y-2">
      <div className="text-[11px] font-mono uppercase text-slate-400 flex justify-between px-1">
        <span>Glove-Friendly Industrial Touch Keypad (Sec 7.2)</span>
        <button
          type="button"
          onClick={() => onChange('')}
          className="text-amber-400 font-bold hover:underline"
        >
          CLEAR
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {keys.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => handleTap(k)}
            className="h-14 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-sky-500 active:text-slate-950 border border-slate-600 text-xl font-black text-white transition"
          >
            {k}
          </button>
        ))}
        <button
          type="button"
          onClick={handleBackspace}
          className="h-14 rounded-xl bg-red-950/80 hover:bg-red-900 border border-red-700 text-red-200 flex items-center justify-center"
        >
          <Delete className="w-6 h-6" />
        </button>
      </div>
      {onConfirm && (
        <button
          type="button"
          onClick={onConfirm}
          className="w-full h-14 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-base flex items-center justify-center gap-2 mt-2 shadow-lg"
        >
          <Check className="w-5 h-5" />
          ENTER / VALIDATE READING
        </button>
      )}
    </div>
  );
}