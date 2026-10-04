import { GoogleGenAI } from '@google/genai';
import { DocumentChunk, SourceCitation } from '../types.js';

export class RetrievalEngine {
  private ai?: GoogleGenAI;

  constructor(aiClient?: GoogleGenAI) {
    this.ai = aiClient;
  }

  /**
   * Tokenize text into lower-case alphanumeric tokens for BM25/keyword indexing.
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 1);
  }

  /**
   * Compute BM25-like keyword relevance score for each chunk
   */
  public searchKeyword(query: string, chunks: DocumentChunk[], topK: number = 5): { chunk: DocumentChunk; score: number }[] {
    const queryTokens = this.tokenize(query);
    if (queryTokens.length === 0) {
      return chunks.slice(0, topK).map(chunk => ({ chunk, score: 0.5 }));
    }

    // Document frequencies
    const docFreq: Map<string, number> = new Map();
    for (const chunk of chunks) {
      const uniqueChunkTokens = new Set(this.tokenize(chunk.content + ' ' + chunk.sectionTitle));
      for (const token of uniqueChunkTokens) {
        docFreq.set(token, (docFreq.get(token) || 0) + 1);
      }
    }

    const totalDocs = chunks.length;
    const avgDocLen = chunks.reduce((acc, c) => acc + c.content.length, 0) / (totalDocs || 1);
    const k1 = 1.5;
    const b = 0.75;

    const scored = chunks.map((chunk) => {
      const chunkText = (chunk.sectionTitle + ' ' + chunk.content).toLowerCase();
      const tokens = this.tokenize(chunkText);
      const tokenCounts: Map<string, number> = new Map();
      for (const t of tokens) {
        tokenCounts.set(t, (tokenCounts.get(t) || 0) + 1);
      }

      let score = 0;
      for (const qToken of queryTokens) {
        const count = tokenCounts.get(qToken) || 0;
        if (count > 0) {
          const df = docFreq.get(qToken) || 1;
          const idf = Math.log((totalDocs - df + 0.5) / (df + 0.5) + 1);
          const tf = (count * (k1 + 1)) / (count + k1 * (1 - b + b * (chunk.content.length / avgDocLen)));
          score += idf * tf;
        }

        // Exact substring bonus (e.g. acronyms or formulas)
        if (chunkText.includes(qToken)) {
          score += 1.0;
        }
      }

      // Exact query phrase bonus
      if (chunkText.includes(query.toLowerCase().trim())) {
        score += 3.0;
      }

      // Title bonus
      if (chunk.sectionTitle.toLowerCase().includes(query.toLowerCase().trim())) {
        score += 2.0;
      }

      return { chunk, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }

  /**
   * Search using high-precision BM25 keyword & technical acronym matching
   */
  public async searchHybrid(
    query: string,
    chunks: DocumentChunk[],
    topK: number = 5
  ): Promise<{ chunk: DocumentChunk; score: number }[]> {
    if (chunks.length === 0) return [];
    // High-precision BM25 with acronym, phrase, and title weighting
    const keywordResults = this.searchKeyword(query, chunks, topK);
    return keywordResults;
  }

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dot += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Format source citations from matched chunks
   */
  public createCitations(results: { chunk: DocumentChunk; score: number }[]): SourceCitation[] {
    return results.map(({ chunk, score }) => {
      // Find clean excerpt (first 200 chars or most relevant sentence)
      let excerpt = chunk.content.replace(/\s+/g, ' ').trim();
      if (excerpt.length > 220) {
        excerpt = excerpt.slice(0, 217) + '...';
      }

      return {
        chunkId: chunk.id,
        pageNumber: chunk.pageNumber,
        sectionTitle: chunk.sectionTitle,
        excerpt,
        relevanceScore: Math.round(score * 100) / 100
      };
    });
  }
}
