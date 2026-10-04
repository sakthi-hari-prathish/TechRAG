import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GeminiService } from './src/server/geminiService.js';
import { RetrievalEngine } from './src/server/retrievalEngine.js';
import { DocumentStore } from './src/server/documentStore.js';
import { ChatMessage, QueryRequest } from './src/types.js';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Initialize services
const geminiService = new GeminiService();
const retrievalEngine = new RetrievalEngine(geminiService.getGenAI());
const documentStore = new DocumentStore(geminiService, retrievalEngine);

// Multer memory storage for uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 30 * 1024 * 1024, // 30 MB
  },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.pdf', '.docx', '.txt', '.md'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext) || file.mimetype.includes('pdf') || file.mimetype.includes('document') || file.mimetype.includes('text')) {
      cb(null, true);
    } else {
      cb(new Error('Supported file formats are PDF, DOCX, TXT, and Markdown.'));
    }
  },
});

// ----------------- API ROUTES -----------------

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    geminiConfigured: !!process.env.GEMINI_API_KEY,
  });
});

// List all documents
app.get('/api/documents', (_req, res) => {
  try {
    const docs = documentStore.getAllDocuments();
    res.json({ success: true, documents: docs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get document metadata & outline
app.get('/api/documents/:id', (req, res) => {
  try {
    const doc = documentStore.getDocument(req.params.id);
    if (!doc) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }
    res.json({ success: true, document: doc });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get document chunks
app.get('/api/documents/:id/chunks', (req, res) => {
  try {
    const chunks = documentStore.getDocumentChunks(req.params.id);
    res.json({ success: true, chunks });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Upload document
app.post('/api/documents/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded.' });
    }

    const doc = await documentStore.addDocumentFromFile({
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      buffer: req.file.buffer,
    });

    res.json({
      success: true,
      document: doc,
      message: 'Document processed and indexed successfully.',
    });
  } catch (err: any) {
    console.error('Upload processing error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to process document.',
    });
  }
});

// Delete document
app.delete('/api/documents/:id', (req, res) => {
  try {
    const success = documentStore.deleteDocument(req.params.id);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Query document (RAG Q&A)
app.post('/api/documents/:id/query', async (req, res) => {
  try {
    const { id } = req.params;
    const body: QueryRequest = req.body;
    const { question, sessionId, explanationMode, history } = body;

    if (!question || !question.trim()) {
      return res.status(400).json({ success: false, error: 'Question is required.' });
    }

    const doc = documentStore.getDocument(id);
    if (!doc) {
      return res.status(404).json({ success: false, error: 'Document not found.' });
    }

    const chunks = documentStore.getDocumentChunks(id);

    // 1. Retrieve top relevant chunks using Hybrid Keyword + Embedding Search
    const searchResults = await retrievalEngine.searchHybrid(question, chunks, 5);
    const relevantChunks = searchResults.map((r) => r.chunk);
    const citations = retrievalEngine.createCitations(searchResults);

    // 2. Generate grounded answer via Gemini
    const queryResult = await geminiService.answerQuestion({
      question: question.trim(),
      document: doc,
      relevantChunks,
      citations,
      explanationMode: !!explanationMode,
      history: history || [],
    });

    // 3. Persist to chat session if provided
    if (sessionId) {
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        sessionId,
        documentId: id,
        role: 'user',
        content: question.trim(),
        timestamp: new Date().toISOString(),
        explanationMode: !!explanationMode,
      };

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        sessionId,
        documentId: id,
        role: 'assistant',
        content: queryResult.answer,
        timestamp: new Date().toISOString(),
        sources: queryResult.sources,
        explanationMode: !!explanationMode,
        structuredExplanation: queryResult.structuredExplanation,
        isNotFound: queryResult.isNotFound,
      };

      documentStore.addMessageToSession(sessionId, userMsg);
      documentStore.addMessageToSession(sessionId, assistantMsg);
    }

    res.json({
      success: true,
      result: queryResult,
    });
  } catch (err: any) {
    console.error('Query execution error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to process question.',
    });
  }
});

// Document Summary
app.get('/api/documents/:id/summary', async (req, res) => {
  try {
    const { id } = req.params;
    const doc = documentStore.getDocument(id);
    if (!doc) {
      return res.status(404).json({ success: false, error: 'Document not found.' });
    }

    // Return cached summary if already present
    if (doc.summary) {
      return res.json({ success: true, summary: doc.summary });
    }

    const chunks = documentStore.getDocumentChunks(id);
    const summary = await geminiService.generateSummary(doc, chunks);
    doc.summary = summary;

    res.json({ success: true, summary });
  } catch (err: any) {
    console.error('Summary generation error:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to generate summary.' });
  }
});

// Get or Create Chat Session
app.get('/api/documents/:id/sessions', (req, res) => {
  try {
    const sessions = documentStore.getSessionsForDocument(req.params.id);
    res.json({ success: true, sessions });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/documents/:id/sessions', (req, res) => {
  try {
    const session = documentStore.getOrCreateSession(req.params.id, req.body.sessionId);
    res.json({ success: true, session });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/sessions/:sessionId/clear', (req, res) => {
  try {
    documentStore.clearSessionMessages(req.params.sessionId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ----------------- VITE / STATIC SERVING -----------------

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: PORT,
      },
      appType: 'spa',
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`>>> TechRAG Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup failure:', err);
  process.exit(1);
});
