import { DocumentChunk, DocumentOutlineItem, DocumentMetadata } from '../types.js';

export interface ChunkingOptions {
  maxChunkSizeChars?: number;
  overlapChars?: number;
}

export function parseDocumentContent(
  rawText: string,
  docId: string,
  options: ChunkingOptions = {}
): {
  chunks: DocumentChunk[];
  outline: DocumentOutlineItem[];
  pageCount: number;
  wordCount: number;
} {
  const maxChunkSize = options.maxChunkSizeChars || 1200;
  const overlap = options.overlapChars || 150;

  // Split into page sections if page markers exist
  const pageRegex = /--- PAGE (\d+) ---/gi;
  let pages: { pageNum: number; content: string }[] = [];

  const pageMatches = [...rawText.matchAll(pageRegex)];
  if (pageMatches.length > 0) {
    for (let i = 0; i < pageMatches.length; i++) {
      const match = pageMatches[i];
      const pageNum = parseInt(match[1], 10) || i + 1;
      const startIndex = match.index! + match[0].length;
      const endIndex = i + 1 < pageMatches.length ? pageMatches[i + 1].index! : rawText.length;
      const pageContent = rawText.slice(startIndex, endIndex).trim();
      pages.push({ pageNum, content: pageContent });
    }
  } else {
    // If no explicit page markers, estimate 2200 characters per page (approx 350-400 words)
    const estimatedPageSize = 2200;
    let pageIndex = 1;
    for (let i = 0; i < rawText.length; i += estimatedPageSize) {
      pages.push({
        pageNum: pageIndex++,
        content: rawText.slice(i, i + estimatedPageSize).trim()
      });
    }
    if (pages.length === 0) {
      pages.push({ pageNum: 1, content: rawText });
    }
  }

  const chunks: DocumentChunk[] = [];
  const outline: DocumentOutlineItem[] = [];
  let chunkGlobalIndex = 0;
  let currentSection = 'General Overview';

  // Extract outlines across pages
  for (const page of pages) {
    const lines = page.content.split('\n');
    let currentChunkText = '';
    let chunkCharStart = 0;

    for (let l = 0; l < lines.length; l++) {
      const line = lines[l].trim();
      
      // Check for headings
      const headingMatch = line.match(/^(#{1,4})\s+(.+)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const title = headingMatch[2].replace(/\*\*/g, '').trim();
        currentSection = title;

        outline.push({
          id: `outline-${outline.length + 1}`,
          title,
          pageNumber: page.pageNum,
          level
        });
      }

      currentChunkText += (currentChunkText ? '\n' : '') + lines[l];

      // If chunk reaches target size or at major section boundary
      if (currentChunkText.length >= maxChunkSize || (headingMatch && currentChunkText.length > 500)) {
        const cleanContent = currentChunkText.trim();
        if (cleanContent.length > 0) {
          chunks.push({
            id: `chunk-${docId}-${chunkGlobalIndex++}`,
            documentId: docId,
            chunkIndex: chunks.length,
            pageNumber: page.pageNum,
            sectionTitle: currentSection,
            content: cleanContent,
            charStart: chunkCharStart,
            charEnd: chunkCharStart + cleanContent.length,
            tokenEstimate: Math.ceil(cleanContent.length / 4)
          });
        }

        // Keep slight overlap from the tail
        const overlapSlice = currentChunkText.slice(Math.max(0, currentChunkText.length - overlap));
        currentChunkText = overlapSlice;
        chunkCharStart += maxChunkSize - overlap;
      }
    }

    if (currentChunkText.trim().length > 0) {
      const cleanContent = currentChunkText.trim();
      chunks.push({
        id: `chunk-${docId}-${chunkGlobalIndex++}`,
        documentId: docId,
        chunkIndex: chunks.length,
        pageNumber: page.pageNum,
        sectionTitle: currentSection,
        content: cleanContent,
        charStart: chunkCharStart,
        charEnd: chunkCharStart + cleanContent.length,
        tokenEstimate: Math.ceil(cleanContent.length / 4)
      });
    }
  }

  // Calculate word count
  const words = rawText.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const pageCount = pages.length;

  return {
    chunks,
    outline,
    pageCount,
    wordCount
  };
}
