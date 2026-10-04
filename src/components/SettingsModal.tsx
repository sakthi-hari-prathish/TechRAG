import React from 'react';
import { Settings, X, Sliders, ShieldCheck, Database, Cpu } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  topK: number;
  onChangeTopK: (val: number) => void;
  strictGrounding: boolean;
  onToggleStrictGrounding: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  topK,
  onChangeTopK,
  strictGrounding,
  onToggleStrictGrounding,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Engine Configuration</h3>
              <p className="text-xs text-slate-400">RAG pipeline & retrieval settings</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          {/* Retrieval Top-K */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-medium text-slate-200 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                <span>Top-K Relevant Chunks to Retrieve</span>
              </label>
              <span className="font-mono text-cyan-400 font-semibold bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                {topK} chunks
              </span>
            </div>
            <input
              type="range"
              min="2"
              max="8"
              step="1"
              value={topK}
              onChange={(e) => onChangeTopK(parseInt(e.target.value, 10))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
            <p className="text-[11px] text-slate-500">
              Determines how many high-relevance document sections are supplied into the LLM context.
            </p>
          </div>

          {/* Strict Grounding Rule */}
          <div className="pt-3 border-t border-slate-800 flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="font-medium text-slate-200 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Anti-Hallucination Grounding Invariant</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Requires the model to explicitly reply with <em>"This information is not available in the provided document."</em> whenever the fact is absent.
              </p>
            </div>
            <input
              type="checkbox"
              checked={strictGrounding}
              onChange={onToggleStrictGrounding}
              className="mt-1 w-4 h-4 accent-cyan-500 cursor-pointer"
            />
          </div>

          {/* System Specs Readout */}
          <div className="pt-3 border-t border-slate-800 space-y-2">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              System Architecture
            </div>
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1.5 font-mono text-[11px]">
              <div className="flex justify-between text-slate-400">
                <span>LLM Model:</span>
                <span className="text-cyan-400">gemini-3.8-flash</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Embedding Model:</span>
                <span className="text-cyan-400">gemini-embedding-2-preview</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Vector Strategy:</span>
                <span className="text-slate-300">Hybrid BM25 + Cosine</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Chunk Boundary:</span>
                <span className="text-slate-300">1200 chars / 150 overlap</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
