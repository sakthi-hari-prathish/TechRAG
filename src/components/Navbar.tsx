import React from 'react';
import {
  FileText,
  Upload,
  BookOpen,
  Sparkles,
  Layers,
  ChevronRight,
  Cpu,
  CheckCircle2,
  Menu,
} from 'lucide-react';
import { DocumentMetadata } from '../types.js';

interface NavbarProps {
  currentDocument?: DocumentMetadata;
  explanationMode: boolean;
  onToggleExplanationMode: () => void;
  onOpenUpload: () => void;
  onOpenSummary: () => void;
  onToggleRightPanel: () => void;
  rightPanelOpen: boolean;
  onToggleSidebarMobile: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentDocument,
  explanationMode,
  onToggleExplanationMode,
  onOpenUpload,
  onOpenSummary,
  onToggleRightPanel,
  rightPanelOpen,
  onToggleSidebarMobile,
}) => {
  return (
    <header className="h-14 border-b border-slate-800 bg-slate-900/95 backdrop-blur px-4 flex items-center justify-between z-20 shrink-0">
      {/* Left: Mobile trigger & Brand & Doc Info */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onToggleSidebarMobile}
          className="lg:hidden p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          title="Toggle Sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 font-bold tracking-tight text-white shrink-0">
          <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-sm shadow-cyan-500/10">
            <Cpu className="w-4 h-4" />
          </div>
          <span className="text-base bg-gradient-to-r from-white via-slate-200 to-cyan-400 bg-clip-text text-transparent">
            TechRAG
          </span>
          <span className="hidden sm:inline-block text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 uppercase tracking-wider">
            v2.4 Core
          </span>
        </div>

        {currentDocument && (
          <div className="hidden md:flex items-center gap-2 pl-3 border-l border-slate-800 text-xs min-w-0">
            <span className="text-slate-500">Active Doc:</span>
            <div className="flex items-center gap-1.5 bg-slate-800/80 px-2 py-1 rounded border border-slate-700/60 text-slate-200 truncate max-w-[280px]">
              <FileText className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="truncate font-medium">{currentDocument.title}</span>
              <span className="text-[10px] uppercase font-mono px-1 py-0.2 rounded bg-slate-900 text-slate-400 border border-slate-800 shrink-0">
                {currentDocument.fileType}
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium pl-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Ready</span>
            </div>
          </div>
        )}
      </div>

      {/* Right Action Controls */}
      <div className="flex items-center gap-2">
        {/* Technical Explanation Mode Switch */}
        <button
          onClick={onToggleExplanationMode}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
            explanationMode
              ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-500/10'
              : 'bg-slate-800/60 text-slate-400 border-slate-700/60 hover:text-slate-200 hover:bg-slate-800'
          }`}
          title="Beginner-friendly breakdown with definitions, step-by-step mechanisms, and document examples"
        >
          <Sparkles className={`w-3.5 h-3.5 ${explanationMode ? 'text-amber-400' : 'text-slate-400'}`} />
          <span className="hidden sm:inline">Explanation Mode</span>
          <span className={`text-[10px] font-mono px-1 py-0.2 rounded ${explanationMode ? 'bg-amber-400/20 text-amber-300' : 'bg-slate-900 text-slate-500'}`}>
            {explanationMode ? 'ON' : 'OFF'}
          </span>
        </button>

        {/* Summarize Document Button */}
        {currentDocument && (
          <button
            onClick={onOpenSummary}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800/80 hover:bg-slate-700/80 text-cyan-300 border border-cyan-800/50 transition-colors shadow-sm"
          >
            <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Summarize Document</span>
          </button>
        )}

        {/* Upload Button */}
        <button
          onClick={onOpenUpload}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-sm shadow-cyan-600/20 transition-all cursor-pointer"
        >
          <Upload className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Upload Doc</span>
        </button>

        {/* Right Panel Outline & Sources Toggle */}
        <button
          onClick={onToggleRightPanel}
          className={`p-1.5 rounded-lg border text-xs transition-colors ${
            rightPanelOpen
              ? 'bg-cyan-950/60 text-cyan-400 border-cyan-700/50'
              : 'bg-slate-800/60 text-slate-400 border-slate-700/60 hover:text-slate-200'
          }`}
          title="Toggle Document Outline & Active Sources"
        >
          <Layers className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
