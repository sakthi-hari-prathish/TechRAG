import React, { useRef, useEffect } from 'react';
import {
  FileText,
  Sparkles,
  Layers,
  BookOpen,
  HelpCircle,
  Loader2,
  AlertCircle,
  Cpu,
  CornerDownRight,
  ArrowRight,
  HardDrive,
  Hash,
} from 'lucide-react';
import {
  ChatMessage,
  DocumentMetadata,
  SourceCitation,
} from '../types.js';
import { MessageItem } from './MessageItem.js';
import { ChatInput } from './ChatInput.js';

interface ChatAreaProps {
  currentDocument?: DocumentMetadata;
  messages: ChatMessage[];
  isLoading: boolean;
  explanationMode: boolean;
  onToggleExplanationMode: () => void;
  onSendMessage: (text: string) => void;
  onClearChat: () => void;
  onSelectCitation: (citation: SourceCitation) => void;
  onOpenSummary: () => void;
  onOpenUpload: () => void;
  suggestedQuestions?: string[];
  activeSources: SourceCitation[];
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  currentDocument,
  messages,
  isLoading,
  explanationMode,
  onToggleExplanationMode,
  onSendMessage,
  onClearChat,
  onSelectCitation,
  onOpenSummary,
  onOpenUpload,
  suggestedQuestions = [],
  activeSources,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <div className="flex-1 flex flex-col h-full min-w-0 bg-slate-950 overflow-hidden relative">
      {/* Document Information Bar at Top of Main Area */}
      {currentDocument ? (
        <div className="px-4 py-2.5 bg-slate-900/60 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 rounded-md bg-cyan-950 border border-cyan-800/60 text-cyan-400">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-white truncate max-w-sm sm:max-w-md">
                  {currentDocument.title}
                </h2>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {currentDocument.fileType}
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono mt-0.5">
                <span>{currentDocument.pageCount} pages</span>
                <span>•</span>
                <span>{currentDocument.chunkCount} indexed sections</span>
                <span>•</span>
                <span>~{currentDocument.wordCount.toLocaleString()} words</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenSummary}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-750 text-cyan-400 border border-slate-700 transition-colors text-[11px] font-medium"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Full Summary</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="px-4 py-3 bg-slate-900/40 border-b border-slate-800 text-xs text-slate-400 flex items-center justify-between">
          <span>No document selected</span>
          <button
            onClick={onOpenUpload}
            className="text-cyan-400 hover:underline font-medium"
          >
            Upload Document
          </button>
        </div>
      )}

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {/* Welcome State when conversation is empty or initial greeting only */}
        {(!messages || messages.length <= 1) && currentDocument && (
          <div className="max-w-2xl mx-auto my-6 space-y-6 animate-in fade-in duration-300">
            {/* Hero Card */}
            <div className="p-6 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-900/40 border border-slate-800 shadow-xl text-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 mx-auto flex items-center justify-center shadow-inner">
                <Cpu className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white tracking-tight">
                  {currentDocument.title}
                </h1>
                <p className="text-xs text-slate-400 mt-1 max-w-lg mx-auto leading-relaxed">
                  Indexed {currentDocument.chunkCount} searchable sections across {currentDocument.pageCount} pages.
                  Answers are strictly cited directly from the document.
                </p>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/60 text-cyan-400 border border-cyan-800/60">
                  RAG Vector Search Active
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  Strict Page Citations
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  Anti-Hallucination Guard
                </span>
              </div>
            </div>

            {/* Suggested Questions Section */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Suggested Questions to Ask:</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {suggestedQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => onSendMessage(q)}
                    className="p-3 rounded-xl bg-slate-900/70 hover:bg-slate-800/90 border border-slate-800 hover:border-cyan-700/60 text-left text-xs text-slate-200 transition-all flex items-start justify-between group shadow-sm"
                  >
                    <span className="group-hover:text-cyan-300 leading-relaxed font-medium">
                      {q}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2 mt-0.5" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Render Conversation Messages */}
        {messages.map((msg) => (
          <MessageItem
            key={msg.id}
            message={msg}
            onSelectCitation={onSelectCitation}
          />
        ))}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex gap-3 mb-6 animate-pulse">
            <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-800/60 flex items-center justify-center text-cyan-400 shrink-0">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs text-slate-300 space-y-2 max-w-md">
              <div className="flex items-center gap-2 text-cyan-400 font-medium">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Searching document & verifying source citations...</span>
              </div>
              <div className="space-y-1.5 pt-1">
                <div className="h-2 bg-slate-800 rounded-full w-3/4" />
                <div className="h-2 bg-slate-800 rounded-full w-5/6" />
                <div className="h-2 bg-slate-800 rounded-full w-1/2" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Box at Bottom */}
      <ChatInput
        onSendMessage={onSendMessage}
        isLoading={isLoading}
        explanationMode={explanationMode}
        onToggleExplanationMode={onToggleExplanationMode}
        onClearChat={onClearChat}
        suggestedQuestions={suggestedQuestions}
        disabled={!currentDocument}
      />
    </div>
  );
};
