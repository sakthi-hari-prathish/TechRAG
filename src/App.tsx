import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar.js';
import { Sidebar } from './components/Sidebar.js';
import { ChatArea } from './components/ChatArea.js';
import { RightPanel } from './components/RightPanel.js';
import { DocumentUploadModal } from './components/DocumentUploadModal.js';
import { SummaryModal } from './components/SummaryModal.js';
import { SettingsModal } from './components/SettingsModal.js';
import {
  ChatMessage,
  ChatSession,
  DocumentChunk,
  DocumentMetadata,
  SourceCitation,
} from './types.js';
import { api } from './services/api.js';

export default function App() {
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [activeDocumentId, setActiveDocumentId] = useState<string | undefined>();
  const [chunks, setChunks] = useState<DocumentChunk[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | undefined>();
  const [activeSources, setActiveSources] = useState<SourceCitation[]>([]);
  const [highlightedChunkId, setHighlightedChunkId] = useState<string | undefined>();

  // Modals & Panels
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Assistant Configuration
  const [explanationMode, setExplanationMode] = useState(false);
  const [topK, setTopK] = useState(5);
  const [strictGrounding, setStrictGrounding] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Load documents on initial mount
  const loadDocuments = useCallback(async (selectId?: string) => {
    try {
      const docs = await api.getDocuments();
      setDocuments(docs);

      if (docs.length > 0) {
        const targetId = selectId && docs.some((d) => d.id === selectId) ? selectId : docs[0].id;
        setActiveDocumentId(targetId);
      }
    } catch (err) {
      console.error('Failed to load documents:', err);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // When activeDocumentId changes, fetch its chunks & session
  useEffect(() => {
    if (!activeDocumentId) return;

    let isSubscribed = true;

    // Fetch Chunks
    api.getDocumentChunks(activeDocumentId).then((c) => {
      if (isSubscribed) setChunks(c);
    }).catch(console.error);

    // Fetch / Create Session
    api.getOrCreateSession(activeDocumentId).then((sess) => {
      if (isSubscribed) {
        setSessions([sess]);
        setActiveSessionId(sess.id);

        // Find sources from last assistant message if any
        const lastAssistant = [...sess.messages].reverse().find((m) => m.role === 'assistant' && m.sources && m.sources.length > 0);
        if (lastAssistant && lastAssistant.sources) {
          setActiveSources(lastAssistant.sources);
        } else {
          setActiveSources([]);
        }
      }
    }).catch(console.error);

    return () => {
      isSubscribed = false;
    };
  }, [activeDocumentId]);

  const activeDoc = documents.find((d) => d.id === activeDocumentId);
  const currentSession = sessions.find((s) => s.id === activeSessionId);
  const messages = currentSession?.messages || [];

  // Handlers
  const handleSelectDocument = (docId: string) => {
    if (docId !== activeDocumentId) {
      setActiveDocumentId(docId);
      setActiveSources([]);
      setHighlightedChunkId(undefined);
    }
  };

  const handleDeleteDocument = async (docId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to remove this document?')) return;

    try {
      await api.deleteDocument(docId);
      const remaining = documents.filter((d) => d.id !== docId);
      setDocuments(remaining);
      if (activeDocumentId === docId) {
        if (remaining.length > 0) {
          setActiveDocumentId(remaining[0].id);
        } else {
          setActiveDocumentId(undefined);
          setChunks([]);
          setActiveSources([]);
        }
      }
    } catch (err: any) {
      alert(`Could not delete document: ${err.message}`);
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!activeDocumentId || !activeSessionId || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sessionId: activeSessionId,
      documentId: activeDocumentId,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
      explanationMode,
    };

    // Optimistically update session
    const updatedMessages = [...messages, userMsg];
    setSessions((prev) =>
      prev.map((s) => (s.id === activeSessionId ? { ...s, messages: updatedMessages } : s))
    );

    setIsLoading(true);

    try {
      const history = updatedMessages
        .slice(-6)
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

      const queryRes = await api.queryDocument({
        documentId: activeDocumentId,
        question: text,
        sessionId: activeSessionId,
        explanationMode,
        history,
      });

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        sessionId: activeSessionId,
        documentId: activeDocumentId,
        role: 'assistant',
        content: queryRes.answer,
        timestamp: new Date().toISOString(),
        sources: queryRes.sources,
        explanationMode,
        structuredExplanation: queryRes.structuredExplanation,
        isNotFound: queryRes.isNotFound,
      };

      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSessionId ? { ...s, messages: [...updatedMessages, assistantMsg] } : s
        )
      );

      if (queryRes.sources && queryRes.sources.length > 0) {
        setActiveSources(queryRes.sources);
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sessionId: activeSessionId,
        documentId: activeDocumentId,
        role: 'assistant',
        content: `Error processing query: ${err.message || 'Unknown network error'}. Please try again.`,
        timestamp: new Date().toISOString(),
      };

      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSessionId ? { ...s, messages: [...updatedMessages, errorMsg] } : s
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = async () => {
    if (!activeSessionId) return;
    try {
      await api.clearSession(activeSessionId);
      setSessions((prev) =>
        prev.map((s) => (s.id === activeSessionId ? { ...s, messages: [] } : s))
      );
      setActiveSources([]);
    } catch (err) {
      console.error('Failed to clear session:', err);
    }
  };

  const handleNewSession = async () => {
    if (!activeDocumentId) return;
    try {
      const newSess = await api.getOrCreateSession(activeDocumentId);
      setSessions((prev) => [newSess, ...prev]);
      setActiveSessionId(newSess.id);
      setActiveSources([]);
    } catch (err) {
      console.error('Failed to create new session:', err);
    }
  };

  const handleSelectCitation = (citation: SourceCitation) => {
    setRightPanelOpen(true);
    setHighlightedChunkId(citation.chunkId);
    setTimeout(() => {
      const el = document.getElementById(citation.chunkId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 antialiased font-sans select-none">
      {/* Top Navbar */}
      <Navbar
        currentDocument={activeDoc}
        explanationMode={explanationMode}
        onToggleExplanationMode={() => setExplanationMode(!explanationMode)}
        onOpenUpload={() => setUploadModalOpen(true)}
        onOpenSummary={() => setSummaryModalOpen(true)}
        onToggleRightPanel={() => setRightPanelOpen(!rightPanelOpen)}
        rightPanelOpen={rightPanelOpen}
        onToggleSidebarMobile={() => setMobileSidebarOpen(true)}
      />

      {/* Main Layout Area */}
      <div className="flex-1 flex overflow-hidden relative select-text">
        {/* Left Navigation Sidebar */}
        <Sidebar
          documents={documents}
          activeDocumentId={activeDocumentId}
          onSelectDocument={handleSelectDocument}
          onOpenUpload={() => setUploadModalOpen(true)}
          onDeleteDocument={handleDeleteDocument}
          onOpenSummary={() => setSummaryModalOpen(true)}
          onOpenSettings={() => setSettingsModalOpen(true)}
          mobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelectSession={(sId) => setActiveSessionId(sId)}
          onNewSession={handleNewSession}
        />

        {/* Center Chat / Question Area */}
        <ChatArea
          currentDocument={activeDoc}
          messages={messages}
          isLoading={isLoading}
          explanationMode={explanationMode}
          onToggleExplanationMode={() => setExplanationMode(!explanationMode)}
          onSendMessage={handleSendMessage}
          onClearChat={handleClearChat}
          onSelectCitation={handleSelectCitation}
          onOpenSummary={() => setSummaryModalOpen(true)}
          onOpenUpload={() => setUploadModalOpen(true)}
          suggestedQuestions={activeDoc?.suggestedQuestions}
          activeSources={activeSources}
        />

        {/* Right Intelligence Panel (Collapsible) */}
        <RightPanel
          isOpen={rightPanelOpen}
          onClose={() => setRightPanelOpen(false)}
          document={activeDoc}
          chunks={chunks}
          activeSources={activeSources}
          onSelectChunk={(chunk) => setHighlightedChunkId(chunk.id)}
          onAskQuestionFromOutline={(q) => handleSendMessage(q)}
          highlightedChunkId={highlightedChunkId}
        />
      </div>

      {/* Upload Modal */}
      <DocumentUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onUploadSuccess={(newId) => loadDocuments(newId)}
        onSelectSample={(sampleId) => handleSelectDocument(sampleId)}
      />

      {/* Summary Modal */}
      <SummaryModal
        isOpen={summaryModalOpen}
        onClose={() => setSummaryModalOpen(false)}
        document={activeDoc}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        topK={topK}
        onChangeTopK={setTopK}
        strictGrounding={strictGrounding}
        onToggleStrictGrounding={() => setStrictGrounding(!strictGrounding)}
      />
    </div>
  );
}
