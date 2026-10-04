import React from 'react';
import {
  Plus,
  FileText,
  Trash2,
  BookOpen,
  MessageSquare,
  Settings,
  X,
  FileCode,
  CheckCircle,
  Database,
  Sliders,
  ExternalLink,
} from 'lucide-react';
import { DocumentMetadata, ChatSession } from '../types.js';

interface SidebarProps {
  documents: DocumentMetadata[];
  activeDocumentId?: string;
  onSelectDocument: (docId: string) => void;
  onOpenUpload: () => void;
  onDeleteDocument: (docId: string, e: React.MouseEvent) => void;
  onOpenSummary: () => void;
  onOpenSettings: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  sessions: ChatSession[];
  activeSessionId?: string;
  onSelectSession: (sessionId: string) => void;
  onNewSession: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  documents,
  activeDocumentId,
  onSelectDocument,
  onOpenUpload,
  onDeleteDocument,
  onOpenSummary,
  onOpenSettings,
  mobileOpen,
  onCloseMobile,
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
}) => {
  const activeDoc = documents.find((d) => d.id === activeDocumentId);

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-30 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 w-72 bg-slate-900 border-r border-slate-800 flex flex-col z-40 transition-transform duration-200 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top Header inside sidebar */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Technical Documents
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-cyan-400 border border-slate-700">
              {documents.length}
            </span>
          </div>
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1 text-slate-400 hover:text-white rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Primary Action: New Document */}
        <div className="p-3 border-b border-slate-800">
          <button
            onClick={() => {
              onOpenUpload();
              onCloseMobile();
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs shadow-md shadow-cyan-900/30 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Upload New Document</span>
          </button>
        </div>

        {/* Document List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          <div>
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider px-2 mb-2 flex items-center justify-between">
              <span>Indexed Documents</span>
            </div>

            <div className="space-y-1">
              {documents.map((doc) => {
                const isActive = doc.id === activeDocumentId;
                return (
                  <div
                    key={doc.id}
                    onClick={() => {
                      onSelectDocument(doc.id);
                      onCloseMobile();
                    }}
                    className={`group relative flex items-start gap-2.5 p-2 rounded-lg text-xs cursor-pointer transition-all border ${
                      isActive
                        ? 'bg-cyan-950/40 border-cyan-800/80 text-white shadow-xs'
                        : 'border-transparent text-slate-300 hover:bg-slate-800/60 hover:text-slate-100'
                    }`}
                  >
                    <div
                      className={`mt-0.5 p-1.5 rounded shrink-0 ${
                        isActive
                          ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                          : 'bg-slate-800 text-slate-400 group-hover:text-slate-200'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                    </div>

                    <div className="flex-1 min-w-0 pr-6">
                      <p className="font-medium truncate leading-tight">{doc.title}</p>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500 font-mono">
                        <span className="uppercase">{doc.fileType}</span>
                        <span>•</span>
                        <span>{doc.pageCount} {doc.pageCount === 1 ? 'page' : 'pages'}</span>
                        <span>•</span>
                        <span>{doc.chunkCount} chunks</span>
                      </div>
                    </div>

                    {/* Delete button (hidden on samples or subtle) */}
                    <button
                      onClick={(e) => onDeleteDocument(doc.id, e)}
                      className="absolute right-2 top-2 p-1 text-slate-500 hover:text-red-400 hover:bg-slate-800/80 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Remove document"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chat History / Sessions for active document */}
          {activeDoc && (
            <div className="pt-2 border-t border-slate-800/60">
              <div className="flex items-center justify-between px-2 mb-2">
                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="w-3 h-3 text-cyan-400" />
                  Chat History
                </span>
                <button
                  onClick={onNewSession}
                  className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-0.5"
                  title="Start new conversation"
                >
                  <Plus className="w-3 h-3" />
                  New Chat
                </button>
              </div>

              <div className="space-y-1">
                {sessions.map((sess) => {
                  const isCurrent = sess.id === activeSessionId;
                  return (
                    <button
                      key={sess.id}
                      onClick={() => {
                        onSelectSession(sess.id);
                        onCloseMobile();
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs truncate transition-colors flex items-center gap-2 ${
                        isCurrent
                          ? 'bg-slate-800 text-cyan-300 font-medium border border-slate-700'
                          : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                      <span className="truncate">{sess.title}</span>
                      <span className="text-[9px] font-mono text-slate-500 ml-auto shrink-0">
                        {sess.messages.length} msgs
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Footer: Document Summary & Settings */}
        <div className="p-3 border-t border-slate-800 space-y-1.5 bg-slate-900/80">
          <button
            onClick={() => {
              onOpenSummary();
              onCloseMobile();
            }}
            disabled={!activeDoc}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed border border-slate-800 hover:border-slate-700"
          >
            <BookOpen className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="flex-1 text-left">Document Summary</span>
          </button>

          <button
            onClick={() => {
              onOpenSettings();
              onCloseMobile();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors border border-slate-800 hover:border-slate-700"
          >
            <Settings className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="flex-1 text-left">Engine Settings</span>
          </button>
        </div>
      </aside>
    </>
  );
};
