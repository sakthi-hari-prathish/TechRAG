import {
  DocumentChunk,
  DocumentMetadata,
  DocumentSummaryData,
  QueryResponse,
  ChatSession,
} from '../types.js';

export const api = {
  async getDocuments(): Promise<DocumentMetadata[]> {
    const res = await fetch('/api/documents');
    if (!res.ok) throw new Error('Failed to fetch documents');
    const data = await res.json();
    return data.documents || [];
  },

  async getDocument(id: string): Promise<DocumentMetadata> {
    const res = await fetch(`/api/documents/${id}`);
    if (!res.ok) throw new Error('Failed to fetch document');
    const data = await res.json();
    return data.document;
  },

  async getDocumentChunks(id: string): Promise<DocumentChunk[]> {
    const res = await fetch(`/api/documents/${id}/chunks`);
    if (!res.ok) throw new Error('Failed to fetch document chunks');
    const data = await res.json();
    return data.chunks || [];
  },

  async uploadDocument(file: File): Promise<DocumentMetadata> {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/documents/upload', {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to upload document');
    }
    return data.document;
  },

  async deleteDocument(id: string): Promise<boolean> {
    const res = await fetch(`/api/documents/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete document');
    const data = await res.json();
    return data.success;
  },

  async queryDocument(params: {
    documentId: string;
    question: string;
    sessionId?: string;
    explanationMode?: boolean;
    history?: { role: 'user' | 'assistant'; content: string }[];
  }): Promise<QueryResponse> {
    const res = await fetch(`/api/documents/${params.documentId}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Query failed');
    }
    return data.result;
  },

  async getDocumentSummary(id: string): Promise<DocumentSummaryData> {
    const res = await fetch(`/api/documents/${id}/summary`);
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to fetch summary');
    }
    return data.summary;
  },

  async getOrCreateSession(documentId: string, sessionId?: string): Promise<ChatSession> {
    const res = await fetch(`/api/documents/${documentId}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to initialize session');
    }
    return data.session;
  },

  async clearSession(sessionId: string): Promise<boolean> {
    const res = await fetch(`/api/sessions/${sessionId}/clear`, {
      method: 'DELETE',
    });
    const data = await res.json();
    return data.success;
  },
};
