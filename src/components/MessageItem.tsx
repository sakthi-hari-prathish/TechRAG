import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  FileText,
  Sparkles,
  Copy,
  Check,
  AlertTriangle,
  Lightbulb,
  ExternalLink,
  Layers,
  ChevronDown,
  ChevronUp,
  Cpu,
} from 'lucide-react';
import { ChatMessage, SourceCitation } from '../types.js';

interface MessageItemProps {
  message: ChatMessage;
  onSelectCitation?: (citation: SourceCitation) => void;
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  onSelectCitation,
}) => {
  const [copied, setCopied] = useState(false);
  const [showAllSources, setShowAllSources] = useState(false);
  const isUser = message.role === 'user';

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isUser) {
    return (
      <div className="flex justify-end mb-4 group">
        <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl bg-cyan-600/90 text-white p-3.5 shadow-md shadow-cyan-950/20 border border-cyan-500/40">
          <div className="flex items-center justify-between gap-3 text-[11px] text-cyan-200/90 mb-1">
            <span className="font-semibold">You</span>
            {message.explanationMode && (
              <span className="flex items-center gap-1 bg-cyan-900/60 text-cyan-200 px-1.5 py-0.2 rounded font-mono text-[9px] border border-cyan-400/30">
                <Sparkles className="w-2.5 h-2.5" />
                Explanation Mode
              </span>
            )}
          </div>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
          <div className="text-[10px] text-cyan-300/70 text-right mt-1 font-mono">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    );
  }

  // Assistant response
  const isNotFound = message.isNotFound || message.content.toLowerCase().includes('not available in the provided document');
  const sources = message.sources || [];
  const struct = message.structuredExplanation;

  return (
    <div className="flex gap-3 mb-6 group">
      {/* Bot Icon */}
      <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-700/50 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5 shadow-sm">
        <Cpu className="w-4 h-4" />
      </div>

      {/* Bot Bubble */}
      <div className="flex-1 min-w-0 space-y-3">
        {/* Main Content Card */}
        <div className={`rounded-xl border p-4 shadow-sm ${
          isNotFound
            ? 'bg-amber-950/20 border-amber-800/40 text-slate-200'
            : 'bg-slate-900/90 border-slate-800 text-slate-200'
        }`}>
          {/* Header Row */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/60">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-cyan-400">TechRAG Assistant</span>
              {message.explanationMode && (
                <span className="flex items-center gap-1 text-[10px] font-mono text-amber-400 bg-amber-950/50 border border-amber-800/60 px-1.5 py-0.5 rounded">
                  <Sparkles className="w-2.5 h-2.5" />
                  Technical Explanation
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-slate-500">
                {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              <button
                onClick={handleCopy}
                className="p-1 text-slate-500 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
                title="Copy response"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Not Found Warning Badge if applicable */}
          {isNotFound && (
            <div className="mb-3 p-3 rounded-lg bg-amber-950/40 border border-amber-700/60 flex items-start gap-2.5 text-amber-300 text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold block mb-0.5">Strict Grounding Invariant:</strong>
                This information is not available in the provided document. The assistant adheres strictly to uploaded document contents and will not hallucinate facts.
              </div>
            </div>
          )}

          {/* Markdown Content */}
          <div className="tech-prose text-sm">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>

          {/* Technical Explanation Mode Cards (Breakdown) */}
          {struct && (
            <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 uppercase tracking-wider">
                <Lightbulb className="w-3.5 h-3.5" />
                <span>Beginner-Friendly Technical Breakdown</span>
              </div>

              {/* Simple Definition */}
              {struct.simpleDefinition && (
                <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-800/40 text-xs">
                  <span className="text-[11px] font-mono font-semibold text-amber-400 uppercase tracking-wider block mb-1">
                    Simple Definition:
                  </span>
                  <p className="text-slate-200 font-medium">{struct.simpleDefinition}</p>
                </div>
              )}

              {/* How It Works (Step-by-step) */}
              {struct.howItWorks && struct.howItWorks.length > 0 && (
                <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-xs">
                  <span className="text-[11px] font-mono font-semibold text-cyan-400 uppercase tracking-wider block mb-2">
                    How It Works:
                  </span>
                  <ol className="list-decimal pl-4 space-y-1 text-slate-300">
                    {struct.howItWorks.map((step, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Important Technical Points */}
              {struct.importantTechnicalPoints && struct.importantTechnicalPoints.length > 0 && (
                <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-xs">
                  <span className="text-[11px] font-mono font-semibold text-indigo-400 uppercase tracking-wider block mb-2">
                    Important Technical Points:
                  </span>
                  <ul className="list-disc pl-4 space-y-1 text-slate-300">
                    {struct.importantTechnicalPoints.map((pt, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {pt}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Concrete Example From Document */}
              {struct.documentExample && (
                <div className="p-3 rounded-lg bg-cyan-950/20 border border-cyan-800/40 text-xs">
                  <span className="text-[11px] font-mono font-semibold text-cyan-400 uppercase tracking-wider block mb-1">
                    Example From Document:
                  </span>
                  <p className="text-slate-300 font-mono text-[11px] bg-slate-950/80 p-2 rounded border border-slate-800">
                    {struct.documentExample}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Source Citations Section */}
        {sources.length > 0 && !isNotFound && (
          <div className="bg-slate-950/60 border border-slate-800/90 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-cyan-400" />
                <span>Verified Sources ({sources.length}):</span>
              </span>
              {sources.length > 2 && (
                <button
                  onClick={() => setShowAllSources(!showAllSources)}
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-0.5"
                >
                  {showAllSources ? 'Show less' : 'View all'}
                  {showAllSources ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              )}
            </div>

            {/* Source Pills / Cards */}
            <div className="space-y-1.5">
              {(showAllSources ? sources : sources.slice(0, 2)).map((source, sIdx) => (
                <div
                  key={sIdx}
                  onClick={() => onSelectCitation && onSelectCitation(source)}
                  className="flex items-start gap-2 p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-cyan-800/70 cursor-pointer transition-all text-xs group"
                >
                  <span className="shrink-0 font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/60">
                    Page {source.pageNumber}
                  </span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="font-medium text-slate-200 group-hover:text-cyan-300 truncate">
                        {source.sectionTitle}
                      </span>
                      {source.relevanceScore !== undefined && (
                        <span className="text-[9px] font-mono text-slate-400 shrink-0">
                          {Math.round(source.relevanceScore * 100)}% match
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-1 italic">
                      "{source.excerpt}"
                    </p>
                  </div>

                  <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 shrink-0 mt-1 transition-colors" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
