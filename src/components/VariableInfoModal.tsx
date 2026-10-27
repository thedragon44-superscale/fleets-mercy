import React from 'react';
import { VariableDoc } from '../constants/variableDocs';

interface VariableInfoModalProps {
  doc: VariableDoc | null;
  onClose: () => void;
}

export const VariableInfoModal: React.FC<VariableInfoModalProps> = ({ doc, onClose }) => {
  if (!doc) return null;

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex justify-center items-center p-4 font-mono select-none"
    >
      <div 
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md bg-[#0f1115] border border-cyan-400/80 rounded-xl p-5 flex flex-col gap-4 shadow-2xl relative"
      >
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <div>
            <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest block">{doc.category}</span>
            <h2 className="text-sm font-black text-white uppercase tracking-tight">{doc.title}</h2>
          </div>
          <button 
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center font-black transition-all"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <div className="bg-[#161922] border border-slate-800 rounded-lg p-3">
            <span className="text-[9px] font-black text-cyan-400 uppercase tracking-wider block mb-1">Functional Effect</span>
            <p className="text-[11px] text-slate-300 leading-relaxed font-medium">{doc.effect}</p>
          </div>

          <div className="bg-[#161922] border border-slate-800 rounded-lg p-3">
            <span className="text-[9px] font-black text-amber-400 uppercase tracking-wider block mb-1">In-Game Manifestation</span>
            <p className="text-[11px] text-slate-300 leading-relaxed font-medium">{doc.manifestation}</p>
          </div>
        </div>

        <button 
          onClick={onClose}
          className="w-full bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black py-2 rounded-lg text-[10px] uppercase tracking-widest transition-all shadow-lg mt-1"
        >
          Got It
        </button>
      </div>
    </div>
  );
};
