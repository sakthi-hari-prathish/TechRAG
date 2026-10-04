export interface DocumentChunk {
  id: string;
  documentId: string;
  chunkIndex: number;
  pageNumber: number;
  sectionTitle: string;
  content: string;
  charStart: number;
  charEnd: number;
  embedding?: number[];
  tokenEstimate?: number;
}

export interface DocumentOutlineItem {
  id: string;
  title: string;
  pageNumber: number;
  level: number;
  chunkId?: string;
}

export interface DocumentMetadata {
  id: string;
  title: string;
  fileName: string;
  fileSize: number;
  fileType: 'pdf' | 'docx' | 'txt' | 'md';
  uploadedAt: string;
  pageCount: number;
  chunkCount: number;
  wordCount: number;
  status: 'processing' | 'ready' | 'error';
  errorMessage?: string;
  summary?: DocumentSummaryData;
  suggestedQuestions?: string[];
  outline: DocumentOutlineItem[];
}

export interface SourceCitation {
  chunkId: string;
  pageNumber: number;
  sectionTitle: string;
  excerpt: string;
  relevanceScore?: number;
}

export interface StructuredExplanation {
  simpleDefinition: string;
  highLevelExplanation: string;
  howItWorks: string[];
  importantTechnicalPoints: string[];
  documentExample?: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  documentId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  sources?: SourceCitation[];
  explanationMode?: boolean;
  structuredExplanation?: StructuredExplanation;
  isNotFound?: boolean;
  isLoading?: boolean;
  error?: string;
}

export interface ChatSession {
  id: string;
  documentId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

export interface DocumentSummaryData {
  shortOverview: string;
  importantConcepts: string[];
  keySpecifications: { label: string; value: string; unit?: string }[];
  importantComponents: { name: string; role: string; details?: string }[];
  formulasAndParameters: { name: string; formulaOrValue: string; note?: string }[];
  conclusionsAndLimitations: string[];
  generatedAt: string;
}

export interface QueryRequest {
  documentId: string;
  sessionId?: string;
  question: string;
  explanationMode?: boolean;
  history?: { role: 'user' | 'assistant'; content: string }[];
}

export interface QueryResponse {
  answer: string;
  sources: SourceCitation[];
  isNotFound: boolean;
  explanationMode: boolean;
  structuredExplanation?: StructuredExplanation;
  suggestedFollowUps?: string[];
}
