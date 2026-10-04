import React, { useState } from 'react';
import {
  Layers,
  FileText,
  Search,
  BookOpen,
  X,
  ExternalLink,
  ChevronRight,
  Hash,
  Sparkles,
  Info,
} from 'lucide-react';
import {
  DocumentChunk,
  DocumentMetadata,
  DocumentOutlineItem,
  SourceCitation,
} from '../types.js';

interface RightPanelProps {
  isOpen: boolean;
  onClose: () => void;
  document?: DocumentMetadata;
  chunks: DocumentChunk[];
  activeSources: SourceCitation[];
  onSelectChunk?: (chunk: DocumentChunk) => void;
  onAskQuestionFromOutline?: (title: string) => void;
  highlightedChunkId?: string;
}

export const RightPanel: React.FC<RightPanelProps> = ({
  isOpen,
  onClose,
  document,
  chunks,
  activeSources,
  onSelectChunk,
  onAskQuestionFromOutline,
  highlightedChunkId,
}) => {
  const [activeTab, setActiveTab] = useState<'sources' | 'outline' | 'chunks'>('sources');
  const [chunkFilterQuery, setChunkFilterQuery] = useState('');
  const [selectedPageFilter, setSelectedPageFilter] = useState<number | 'all'>('all');

  if (!isOpen) return null;

  // Filter chunks
  const filteredChunks = chunks.filter((chunk) => {
    const matchesPage = selectedPageFilter === 'all' || chunk.pageNumber === selectedPageFilter;
    const matchesQuery =
      !chunkFilterQuery ||
      chunk.content.toLowerCase().includes(chunkFilterQuery.toLowerCase()) ||
      chunk.sectionTitle.toLowerCase().includes(chunkFilterQuery.toLowerCase());
    return matchesPage && matchesQuery;
  });

  const pageNumbers = Array.from(new Set(chunks.map((c) => c.pageNumber))).sort((a, b) => a - b);

  return (
    <aside className="w-80 sm:w-96 bg-slate-900 border-l border-slate-800 flex flex-col h-full z-20 shrink-0">
      {/* Top Header */}
      <div className="h-14 border-b border-slate-800 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Document Intelligence
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-950/60 p-1 text-xs">
        <button
          onClick={() => setActiveTab('sources')}
          className={`flex-1 py-1.5 px-2 rounded-md font-medium text-center transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === 'sources'
              ? 'bg-slate-800 text-cyan-400 border border-slate-700'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>Sources</span>
          <span className="text-[10px] font-mono px-1 rounded bg-slate-900 text-cyan-400">
            {activeSources.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('outline')}
          className={`flex-1 py-1.5 px-2 rounded-md font-medium text-center transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === 'outline'
              ? 'bg-slate-800 text-cyan-400 border border-slate-700'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>Outline</span>
          <span className="text-[10px] font-mono px-1 rounded bg-slate-900 text-slate-400">
            {document?.outline?.length || 0}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('chunks')}
          className={`flex-1 py-1.5 px-2 rounded-md font-medium text-center transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === 'chunks'
              ? 'bg-slate-800 text-cyan-400 border border-slate-700'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>Chunks</span>
          <span className="text-[10px] font-mono px-1 rounded bg-slate-900 text-slate-400">
            {chunks.length}
          </span>
        </button>
      </div>

      {/* Panel Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Tab 1: Active Sources */}
        {activeTab === 'sources' && (
          <div className="space-y-3">
            <div className="text-xs text-slate-400">
              Citations and excerpts retrieved for the latest question:
            </div>

            {activeSources.length === 0 ? (
              <div className="p-6 text-center rounded-xl bg-slate-950/40 border border-slate-800 text-slate-500 text-xs">
                <Info className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                <p>No active sources loaded.</p>
                <p className="text-[11px] text-slate-600 mt-1">
                  Ask a question to see exact page citations and matching excerpts.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeSources.map((source, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/90 hover:border-cyan-800/70 transition-all space-y-2 group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/60">
                        Page {source.pageNumber}
                      </span>
                      {source.relevanceScore !== undefined && (
                        <span className="text-[10px] font-mono text-cyan-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                          {Math.round(source.relevanceScore * 100)}% match
                        </span>
                      )}
                    </div>

                    <h4 className="text-xs font-semibold text-slate-200 group-hover:text-cyan-300 transition-colors">
                      {source.sectionTitle}
                    </h4>

                    <div className="text-xs text-slate-400 bg-slate-900/90 p-2.5 rounded-lg border border-slate-800/60 font-mono text-[11px] leading-relaxed">
                      "{source.excerpt}"
                    </div>

                    {onAskQuestionFromOutline && (
                      <button
                        onClick={() => onAskQuestionFromOutline(`Tell me more about ${source.sectionTitle}`)}
                        className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 mt-1 font-medium"
                      >
                        <Sparkles className="w-3 h-3" />
                        Ask about this section
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Document Outline */}
        {activeTab === 'outline' && (
          <div className="space-y-2">
            <div className="text-xs text-slate-400 mb-2">
              Detected sections and document architecture:
            </div>

            {(!document?.outline || document.outline.length === 0) ? (
              <div className="p-6 text-center rounded-xl bg-slate-950/40 border border-slate-800 text-slate-500 text-xs">
                No formal outline headings detected. Document is segmented by pages.
              </div>
            ) : (
              <div className="space-y-1">
                {document.outline.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (onAskQuestionFromOutline) {
                        onAskQuestionFromOutline(`Explain section "${item.title}"`);
                      }
                    }}
                    style={{ paddingLeft: `${Math.max(item.level - 1, 0) * 12 + 8}px` }}
                    className="p-2 rounded-lg text-xs hover:bg-slate-800/80 cursor-pointer flex items-center justify-between group transition-colors border border-transparent hover:border-slate-700/60"
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400/60 group-hover:bg-cyan-400 shrink-0" />
                      <span className="text-slate-300 group-hover:text-cyan-300 truncate font-medium">
                        {item.title}
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-slate-500 shrink-0 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                      p.{item.pageNumber}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Chunks & Pages */}
        {activeTab === 'chunks' && (
          <div className="space-y-3">
            {/* Filter controls */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter chunk text..."
                  value={chunkFilterQuery}
                  onChange={(e) => setChunkFilterQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-cyan-500/60"
                />
              </div>

              {/* Page filter pills */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[10px] font-mono">
                <button
                  onClick={() => setSelectedPageFilter('all')}
                  className={`px-2 py-0.5 rounded border ${
                    selectedPageFilter === 'all'
                      ? 'bg-cyan-950 text-cyan-400 border-cyan-800'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  All
                </button>
                {pageNumbers.map((pg) => (
                  <button
                    key={pg}
                    onClick={() => setSelectedPageFilter(pg)}
                    className={`px-2 py-0.5 rounded border shrink-0 ${
                      selectedPageFilter === pg
                        ? 'bg-cyan-950 text-cyan-400 border-cyan-800'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    P.{pg}
                  </button>
                ))}
              </div>
            </div>

            {/* Chunk cards list */}
            <div className="space-y-2.5">
              {filteredChunks.map((chunk) => {
                const isHighlighted = highlightedChunkId === chunk.id;
                return (
                  <div
                    key={chunk.id}
                    id={chunk.id}
                    onClick={() => onSelectChunk && onSelectChunk(chunk)}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                      isHighlighted
                        ? 'bg-cyan-950/40 border-cyan-500 ring-1 ring-cyan-500/50'
                        : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-slate-900 text-cyan-400 border border-slate-800">
                          Page {chunk.pageNumber}
                        </span>
                        <span className="font-mono text-[9px] text-slate-500">
                          #{chunk.chunkIndex + 1}
                        </span>
                      </div>
                      <span className="text-[9px] font-mono text-slate-500">
                        ~{chunk.tokenEstimate} tokens
                      </span>
                    </div>

                    <h5 className="font-semibold text-slate-200 truncate mb-1">
                      {chunk.sectionTitle}
                    </h5>

                    <p className="text-[11px] text-slate-400 font-mono line-clamp-3 leading-relaxed">
                      {chunk.content}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
