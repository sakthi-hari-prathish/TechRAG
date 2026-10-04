import mammoth from 'mammoth';
import * as pdfParseModule from 'pdf-parse';
import { randomUUID } from 'crypto';

const pdfParse = ((pdfParseModule as any).default || pdfParseModule) as (
  dataBuffer: Buffer,
  options?: any
) => Promise<any>;
import {
  ChatMessage,
  ChatSession,
  DocumentChunk,
  DocumentMetadata,
  DocumentSummaryData,
} from '../types.js';
import { parseDocumentContent } from './documentProcessor.js';
import { GeminiService } from './geminiService.js';
import { RetrievalEngine } from './retrievalEngine.js';
import { SAMPLE_DOCUMENTS } from './sampleDocs.js';

export class DocumentStore {
  private documents: Map<string, DocumentMetadata> = new Map();
  private documentChunks: Map<string, DocumentChunk[]> = new Map();
  private chatSessions: Map<string, ChatSession> = new Map();
  private geminiService: GeminiService;
  private retrievalEngine: RetrievalEngine;

  constructor(geminiService: GeminiService, retrievalEngine: RetrievalEngine) {
    this.geminiService = geminiService;
    this.retrievalEngine = retrievalEngine;
    this.seedSampleDocuments();
  }

  private seedSampleDocuments() {
    for (const sample of SAMPLE_DOCUMENTS) {
      const parsed = parseDocumentContent(sample.text, sample.id);
      const metadata: DocumentMetadata = {
        id: sample.id,
        title: sample.title,
        fileName: sample.fileName,
        fileSize: Buffer.byteLength(sample.text, 'utf8'),
        fileType: sample.fileType,
        uploadedAt: new Date(Date.now() - 3600000).toISOString(),
        pageCount: parsed.pageCount,
        chunkCount: parsed.chunks.length,
        wordCount: parsed.wordCount,
        status: 'ready',
        outline: parsed.outline,
        suggestedQuestions: [
          'What is the main purpose of this design?',
          'Explain the architecture.',
          'What are the important specifications?',
          'Explain the working principle.',
          'What are the limitations?',
          "Explain this document like I'm a beginner.",
        ],
      };

      this.documents.set(sample.id, metadata);
      this.documentChunks.set(sample.id, parsed.chunks);

      // Create an initial chat session for the sample
      const sessionId = `session-${sample.id}`;
      this.chatSessions.set(sessionId, {
        id: sessionId,
        documentId: sample.id,
        title: `Discussion on ${sample.title.slice(0, 30)}...`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: [
          {
            id: `msg-welcome-${sample.id}`,
            sessionId,
            documentId: sample.id,
            role: 'assistant',
            content: `**Document Loaded:** ${sample.title}\n\nI have indexed all ${parsed.chunks.length} sections across ${parsed.pageCount} pages. You can ask technical questions, request architecture explanations, inspect source citations, or switch to **Technical Explanation Mode** for beginner-friendly breakdowns.`,
            timestamp: new Date().toISOString(),
          },
        ],
      });
    }
  }

  public getAllDocuments(): DocumentMetadata[] {
    return Array.from(this.documents.values()).sort(
      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );
  }

  public getDocument(id: string): DocumentMetadata | undefined {
    return this.documents.get(id);
  }

  public getDocumentChunks(id: string): DocumentChunk[] {
    return this.documentChunks.get(id) || [];
  }

  public deleteDocument(id: string): boolean {
    const deleted = this.documents.delete(id);
    this.documentChunks.delete(id);

    // Delete associated sessions
    for (const [sId, session] of this.chatSessions.entries()) {
      if (session.documentId === id) {
        this.chatSessions.delete(sId);
      }
    }
    return deleted;
  }

  /**
   * Process an uploaded file buffer (PDF, DOCX, TXT, MD)
   */
  public async addDocumentFromFile(file: {
    originalname: string;
    mimetype: string;
    size: number;
    buffer: Buffer;
  }): Promise<DocumentMetadata> {
    const docId = `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const extension = file.originalname.split('.').pop()?.toLowerCase() || '';
    let fileType: 'pdf' | 'docx' | 'txt' | 'md' = 'txt';
    let extractedText = '';

    if (extension === 'pdf' || file.mimetype === 'application/pdf') {
      fileType = 'pdf';
      try {
        // Use custom pagerender in pdf-parse to preserve page delimiters!
        const pdfData = await pdfParse(file.buffer, {
          pagerender: (pageData: any) => {
            return pageData.getTextContent().then((textContent: any) => {
              let text = '';
              for (const item of textContent.items) {
                text += item.str + ' ';
              }
              return `\n--- PAGE ${pageData.pageIndex + 1} ---\n` + text;
            });
          },
        });
        extractedText = pdfData.text;
      } catch (err: any) {
        console.error('PDF parsing error, attempting default mode:', err);
        const fallback = await pdfParse(file.buffer);
        extractedText = fallback.text;
      }
    } else if (
      extension === 'docx' ||
      file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      fileType = 'docx';
      const result = await mammoth.extractRawText({ buffer: file.buffer });
      extractedText = result.value;
    } else {
      fileType = extension === 'md' ? 'md' : 'txt';
      extractedText = file.buffer.toString('utf8');
    }

    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error('No readable text could be extracted from this document.');
    }

    // Parse and chunk
    const parsed = parseDocumentContent(extractedText, docId);

    // Clean title from filename
    const cleanTitle = file.originalname
      .replace(/\.[^/.]+$/, '')
      .replace(/[_-]+/g, ' ')
      .trim();

    const metadata: DocumentMetadata = {
      id: docId,
      title: cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1),
      fileName: file.originalname,
      fileSize: file.size,
      fileType,
      uploadedAt: new Date().toISOString(),
      pageCount: parsed.pageCount,
      chunkCount: parsed.chunks.length,
      wordCount: parsed.wordCount,
      status: 'ready',
      outline: parsed.outline,
      suggestedQuestions: [
        'What is the main purpose of this design?',
        'Explain the architecture of this system.',
        'What are the important specifications?',
        'Explain the working principle.',
        'What are the limitations and constraints?',
        "Explain this document like I'm a beginner.",
      ],
    };

    this.documents.set(docId, metadata);
    this.documentChunks.set(docId, parsed.chunks);

    // Background asynchronous suggested questions enrichment
    this.geminiService
      .generateSuggestedQuestions(metadata, parsed.chunks)
      .then((questions) => {
        metadata.suggestedQuestions = questions;
      })
      .catch((err) => console.warn('Could not generate dynamic questions:', err));

    return metadata;
  }

  /**
   * Chat sessions management
   */
  public getSessionsForDocument(docId: string): ChatSession[] {
    return Array.from(this.chatSessions.values())
      .filter((s) => s.documentId === docId)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  public getOrCreateSession(docId: string, sessionId?: string): ChatSession {
    if (sessionId && this.chatSessions.has(sessionId)) {
      return this.chatSessions.get(sessionId)!;
    }

    const doc = this.documents.get(docId);
    const newSessionId = sessionId || `session-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newSession: ChatSession = {
      id: newSessionId,
      documentId: docId,
      title: `Session: ${doc ? doc.title.slice(0, 24) : 'Document'}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [
        {
          id: `msg-init-${newSessionId}`,
          sessionId: newSessionId,
          documentId: docId,
          role: 'assistant',
          content: `Document **"${doc?.title || 'Active Document'}"** is ready! Ask any technical question or select one of the suggested prompts below.`,
          timestamp: new Date().toISOString(),
        },
      ],
    };

    this.chatSessions.set(newSessionId, newSession);
    return newSession;
  }

  public addMessageToSession(sessionId: string, message: ChatMessage) {
    const session = this.chatSessions.get(sessionId);
    if (session) {
      session.messages.push(message);
      session.updatedAt = new Date().toISOString();
    }
  }

  public clearSessionMessages(sessionId: string) {
    const session = this.chatSessions.get(sessionId);
    if (session) {
      session.messages = [];
      session.updatedAt = new Date().toISOString();
    }
  }
}
