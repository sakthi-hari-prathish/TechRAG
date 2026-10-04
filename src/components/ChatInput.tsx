import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  Trash2,
  HelpCircle,
  CornerDownLeft,
  ChevronUp,
} from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (text: string) => void;
  isLoading: boolean;
  explanationMode: boolean;
  onToggleExplanationMode: () => void;
  onClearChat: () => void;
  suggestedQuestions?: string[];
  disabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  isLoading,
  explanationMode,
  onToggleExplanationMode,
  onClearChat,
  suggestedQuestions = [],
  disabled = false,
}) => {
  const [input, setInput] = useState('');
  const [showSuggestionsMenu, setShowSuggestionsMenu] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [input]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading || disabled) return;
    onSendMessage(input.trim());
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSelectSuggestion = (q: string) => {
    setShowSuggestionsMenu(false);
    onSendMessage(q);
  };

  return (
    <div className="border-t border-slate-800 bg-slate-900/90 backdrop-blur p-3 sm:p-4 z-10 shrink-0">
      {/* Suggestions Drawer Popup if open */}
      {showSuggestionsMenu && suggestedQuestions.length > 0 && (
        <div className="mb-3 p-3 rounded-xl bg-slate-850 border border-slate-700 shadow-xl max-h-56 overflow-y-auto space-y-1.5 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase tracking-wider pb-1 border-b border-slate-700/60 mb-1">
            <span>Suggested Questions for this Document</span>
            <button
              onClick={() => setShowSuggestionsMenu(false)}
              className="text-slate-400 hover:text-white"
            >
              Close
            </button>
          </div>
          {suggestedQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSelectSuggestion(q)}
              className="w-full text-left p-2 rounded-lg text-xs text-slate-200 hover:bg-slate-800 hover:text-cyan-300 transition-colors flex items-center justify-between group"
            >
              <span>{q}</span>
              <CornerDownLeft className="w-3 h-3 text-slate-500 group-hover:text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2" />
            </button>
          ))}
        </div>
      )}

      {/* Main Input Form */}
      <form onSubmit={handleSubmit} className="relative rounded-xl border border-slate-700/80 bg-slate-950 focus-within:border-cyan-500/70 focus-within:ring-1 focus-within:ring-cyan-500/30 transition-all shadow-md">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            disabled
              ? 'Please upload or select a technical document first...'
              : explanationMode
              ? 'Ask for a beginner-friendly explanation (e.g. "What is CDC and how does it work?")...'
              : 'Ask a technical question about architecture, formulas, specifications, or timing...'
          }
          disabled={disabled || isLoading}
          rows={1}
          className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 p-3 pb-10 resize-none focus:outline-hidden disabled:opacity-50 disabled:cursor-not-allowed max-h-36 overflow-y-auto"
        />

        {/* Bottom Toolbar inside the input box */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {/* Explanation Mode Toggle */}
            <button
              type="button"
              onClick={onToggleExplanationMode}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium border transition-colors ${
                explanationMode
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-xs'
                  : 'bg-slate-850 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
              title="Toggle Technical Explanation Mode for step-by-step breakdown"
            >
              <Sparkles className={`w-3 h-3 ${explanationMode ? 'text-amber-400' : 'text-slate-400'}`} />
              <span className="hidden sm:inline">Explanation Mode</span>
            </button>

            {/* Quick Suggestions trigger */}
            {suggestedQuestions.length > 0 && (
              <button
                type="button"
                onClick={() => setShowSuggestionsMenu(!showSuggestionsMenu)}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 border border-slate-700 transition-colors"
                title="View suggested questions"
              >
                <HelpCircle className="w-3 h-3 text-cyan-400" />
                <span className="hidden sm:inline">Suggestions ({suggestedQuestions.length})</span>
                <ChevronUp className={`w-3 h-3 transition-transform ${showSuggestionsMenu ? 'rotate-180' : ''}`} />
              </button>
            )}

            {/* Clear Chat */}
            <button
              type="button"
              onClick={onClearChat}
              className="p-1 rounded-md text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors"
              title="Clear conversation"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden md:inline text-[10px] text-slate-500 font-mono">
              Press Enter ↵ to send
            </span>
            <button
              type="submit"
              disabled={!input.trim() || isLoading || disabled}
              className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white disabled:opacity-30 disabled:cursor-not-allowed shadow-sm transition-all"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
