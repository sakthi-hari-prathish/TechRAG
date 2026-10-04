import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  X,
  Loader2,
  CheckCircle2,
  Cpu,
  Hash,
  AlertCircle,
  Copy,
  Check,
  Sparkles,
  Layers,
  Activity,
} from 'lucide-react';
import { DocumentMetadata, DocumentSummaryData } from '../types.js';
import { api } from '../services/api.js';

interface SummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  document?: DocumentMetadata;
}

export const SummaryModal: React.FC<SummaryModalProps> = ({
  isOpen,
  onClose,
  document,
}) => {
  const [summary, setSummary] = useState<DocumentSummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && document) {
      if (document.summary) {
        setSummary(document.summary);
      } else {
        fetchSummary(document.id);
      }
    }
  }, [isOpen, document]);

  const fetchSummary = async (docId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getDocumentSummary(docId);
      setSummary(data);
    } catch (err: any) {
      setError(err.message || 'Failed to generate document summary.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleCopySummary = () => {
    if (!summary) return;
    const text = `# Technical Summary: ${document?.title}\n\n` +
      `## Overview\n${summary.shortOverview}\n\n` +
      `## Important Concepts\n${summary.importantConcepts.map(c => `- ${c}`).join('\n')}\n\n` +
      `## Key Specifications\n${summary.keySpecifications.map(s => `- ${s.label}: ${s.value} ${s.unit || ''}`).join('\n')}\n\n` +
      `## Important Components\n${summary.importantComponents.map(m => `- ${m.name} (${m.role}): ${m.details || ''}`).join('\n')}\n\n` +
      `## Formulas & Parameters\n${summary.formulasAndParameters.map(f => `- ${f.name}: ${f.formulaOrValue} (${f.note || ''})`).join('\n')}\n\n` +
      `## Conclusions & Limitations\n${summary.conclusionsAndLimitations.map(l => `- ${l}`).join('\n')}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Comprehensive Technical Summary</h3>
              <p className="text-xs text-slate-400 truncate max-w-md">
                {document?.title} • {document?.pageCount} pages • {document?.chunkCount} sections
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {summary && (
              <button
                onClick={handleCopySummary}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                title="Copy markdown summary"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {isLoading ? (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="w-8 h-8 mx-auto text-cyan-400 animate-spin" />
              <p className="text-sm font-medium text-slate-200">
                Synthesizing Technical Summary with Gemini...
              </p>
              <p className="text-xs text-slate-500">
                Analyzing architecture, timing constraints, formulas, and components
              </p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/80 text-red-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
              <div>
                <p className="font-semibold">Summary Generation Error</p>
                <p className="mt-1">{error}</p>
                <button
                  onClick={() => document && fetchSummary(document.id)}
                  className="mt-2 text-cyan-400 hover:underline font-semibold"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : summary ? (
            <div className="space-y-6">
              {/* 1. Short Overview */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-400 uppercase tracking-wider">
                  <Cpu className="w-3.5 h-3.5" />
                  <span>1. Executive Overview</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
                  {summary.shortOverview}
                </p>
              </div>

              {/* 2. Important Concepts */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>2. Important Concepts & Mechanisms</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {summary.importantConcepts.map((concept, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-slate-950/40 border border-slate-800/80 text-xs text-slate-300 flex items-start gap-2"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                      <span>{concept}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Key Specifications */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                  <Activity className="w-3.5 h-3.5" />
                  <span>3. Key Engineering Specifications</span>
                </div>
                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                      <tr>
                        <th className="p-2.5">Parameter / Metric</th>
                        <th className="p-2.5">Value / Specification</th>
                        <th className="p-2.5">Unit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                      {summary.keySpecifications.map((spec, idx) => (
                        <tr key={idx} className="hover:bg-slate-850/50">
                          <td className="p-2.5 font-medium text-slate-200">{spec.label}</td>
                          <td className="p-2.5 font-mono text-cyan-300">{spec.value}</td>
                          <td className="p-2.5 text-slate-400 font-mono">{spec.unit || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 4. Important Components / Modules */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-400 uppercase tracking-wider">
                  <Layers className="w-3.5 h-3.5" />
                  <span>4. Important Components & Functional Modules</span>
                </div>
                <div className="space-y-2">
                  {summary.importantComponents.map((comp, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-slate-950/50 border border-slate-800 flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 text-xs"
                    >
                      <div className="font-semibold text-sky-300">{comp.name}</div>
                      <div className="text-slate-300 flex-1 sm:px-4">{comp.role}</div>
                      {comp.details && (
                        <div className="text-[11px] font-mono text-slate-500">{comp.details}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* 5. Formulas and Technical Parameters */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 uppercase tracking-wider">
                  <Hash className="w-3.5 h-3.5" />
                  <span>5. Key Formulas & Invariant Equations</span>
                </div>
                <div className="space-y-2">
                  {summary.formulasAndParameters.map((f, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-200">{f.name}</span>
                        {f.note && <span className="text-[11px] text-slate-500 italic">{f.note}</span>}
                      </div>
                      <div className="font-mono text-amber-300 bg-slate-900/90 p-2 rounded border border-slate-800/60 overflow-x-auto">
                        {f.formulaOrValue}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 6. Conclusions and Limitations */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-400 uppercase tracking-wider">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>6. Operational Boundaries & Known Limitations</span>
                </div>
                <ul className="space-y-1.5 pl-4 list-disc text-xs text-slate-300">
                  {summary.conclusionsAndLimitations.map((lim, idx) => (
                    <li key={idx} className="leading-relaxed">
                      {lim}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition-colors"
          >
            Close Summary
          </button>
        </div>
      </div>
    </div>
  );
};
