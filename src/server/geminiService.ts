import { GoogleGenAI, Type } from '@google/genai';
import {
  DocumentChunk,
  DocumentMetadata,
  DocumentSummaryData,
  QueryResponse,
  SourceCitation,
  StructuredExplanation,
} from '../types.js';

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }

  public getGenAI(): GoogleGenAI {
    return this.ai;
  }

  /**
   * Generates Q&A response strictly grounded on retrieved document chunks
   */
  public async answerQuestion(params: {
    question: string;
    document: DocumentMetadata;
    relevantChunks: DocumentChunk[];
    citations: SourceCitation[];
    explanationMode?: boolean;
    history?: { role: 'user' | 'assistant'; content: string }[];
  }): Promise<QueryResponse> {
    const { question, document, relevantChunks, citations, explanationMode, history } = params;

    // Check if relevantChunks are empty
    if (!relevantChunks || relevantChunks.length === 0) {
      return {
        answer: 'This information is not available in the provided document.',
        sources: [],
        isNotFound: true,
        explanationMode: !!explanationMode,
      };
    }

    const contextText = relevantChunks
      .map(
        (chunk, idx) =>
          `[DOCUMENT EXCERPT ${idx + 1} | Page ${chunk.pageNumber} | Section: "${chunk.sectionTitle}"]\n${chunk.content}\n`
      )
      .join('\n---\n\n');

    const historyPrompt =
      history && history.length > 0
        ? `Previous conversation context within this document session:\n` +
          history
            .slice(-4)
            .map((h) => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}`)
            .join('\n') +
          '\n\n'
        : '';

    const systemInstruction = `You are TechRAG, an elite technical document AI assistant.
Your absolute duty is to provide strictly accurate, technically rigorous answers based ONLY on the provided document excerpts.

STRICT OPERATING RULES:
1. PRIMARY GROUNDING: Base your answer directly on the provided document excerpts. Do not fabricate, hallucinate, or assume specifications not present in the text.
2. ABSENCE OF INFORMATION: If the requested information is NOT in the provided excerpts, you MUST explicitly state:
"This information is not available in the provided document."
Do not invent or borrow external facts if the document does not mention it.
3. CITATIONS & SOURCES: Always reference the specific page numbers and section titles where information is found.
4. PRESERVE TECHNICAL FIDELITY: Retain exact variable names, register offsets, timing formulas, mathematical equations, frequency figures, acronyms, and constraints.
5. EXPLANATION MODE:
When explanationMode is true (or when the user asks for a simple or beginner explanation of complex technical jargon), format your answer with these exact markdown sections:
### Simple Definition
[One clear, intuitive, beginner-friendly sentence]

### High-Level Explanation
[Plain-English analogy and explanation of what it does and why it is needed]

### How It Works
1. [Step 1]
2. [Step 2]
3. [Step 3]

### Important Technical Points
- [Point 1]
- [Point 2]

### Example from the Document
[A concrete specification, equation, or parameter directly from the document]
6. TONE: Clear, professional, authoritative, and direct.`;

    const prompt = `${historyPrompt}Target Document: "${document.title}" (File: ${document.fileName})

DOCUMENT EXCERPTS:
${contextText}

USER QUESTION: "${question}"
EXPLANATION MODE: ${explanationMode ? 'ENABLED (Provide beginner-friendly structured breakdown)' : 'STANDARD TECHNICAL (Accurate, concise, with citations)'}

Please provide your answer.
If the answer is found in the excerpts, provide a complete response with explicit citations (e.g. "**Source:** Page X — Section Title").
If the answer is NOT mentioned or implied in the excerpts, respond with:
"This information is not available in the provided document."`;

    try {
      let rawAnswer = '';
      const modelsToTry = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];
      let lastError: any = null;

      for (const modelName of modelsToTry) {
        try {
          const response = await this.ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
              systemInstruction,
              temperature: 0.2, // Low temperature for high factual precision
            },
          });
          rawAnswer = response.text?.trim() || '';
          if (rawAnswer) break;
        } catch (err: any) {
          lastError = err;
          console.warn(`Model ${modelName} returned error: ${err.message}. Trying next candidate...`);
          // Brief pause before trying next candidate
          await new Promise((r) => setTimeout(r, 600));
        }
      }

      if (!rawAnswer && lastError) {
        throw lastError;
      }

      const isNotFound =
        rawAnswer.toLowerCase().includes('not available in the provided document') ||
        rawAnswer.toLowerCase().includes('is not available in the document');

      let structuredExplanation: StructuredExplanation | undefined = undefined;

      // When in explanation mode, parse structured sections directly from the response
      if (explanationMode && !isNotFound) {
        const getSection = (title: string): string => {
          const regex = new RegExp(`###\\s*${title}[^\\n]*\\n([\\s\\S]*?)(?=(###|$))`, 'i');
          const match = rawAnswer.match(regex);
          return match ? match[1].trim() : '';
        };

        const getList = (title: string): string[] => {
          const text = getSection(title);
          if (!text) return [];
          return text
            .split('\n')
            .map((line) => line.replace(/^[-*•\d.]+\s*/, '').trim())
            .filter((line) => line.length > 3);
        };

        const def = getSection('Simple Definition') || getSection('Definition');
        const overview = getSection('High-Level Explanation') || getSection('Explanation') || getSection('Overview');
        const steps = getList('How It Works') || getList('Mechanism');
        const points = getList('Important Technical Points') || getList('Key Points') || getList('Important Points');
        const example = getSection('Example from the Document') || getSection('Document Example') || getSection('Example');

        if (def || overview || steps.length > 0) {
          structuredExplanation = {
            simpleDefinition: def || 'A mechanism defined in the document.',
            highLevelExplanation: overview || 'Technical explanation derived from document specifications.',
            howItWorks: steps.length > 0 ? steps : ['Operates according to protocol constraints.'],
            importantTechnicalPoints: points.length > 0 ? points : ['Refer to document specifications.'],
            documentExample: example || undefined,
          };
        }
      }

      return {
        answer: rawAnswer,
        sources: isNotFound ? [] : citations,
        isNotFound,
        explanationMode: !!explanationMode,
        structuredExplanation,
        suggestedFollowUps: this.generateFollowUpQuestions(question, rawAnswer, isNotFound),
      };
    } catch (err: any) {
      console.error('Error generating answer with Gemini:', err);
      throw new Error(`Failed to generate answer: ${err.message || String(err)}`);
    }
  }

  private generateFollowUpQuestions(question: string, answer: string, isNotFound: boolean): string[] {
    if (isNotFound) {
      return [
        'What topics are covered in this document?',
        'Can you summarize the main sections?',
        'Explain the core architecture.',
      ];
    }

    const qLower = question.toLowerCase();
    if (qLower.includes('architecture') || qLower.includes('system') || qLower.includes('module')) {
      return [
        'What are the key specifications for this system?',
        'What are the main limitations or timing constraints?',
        'Explain this design like I am a beginner.',
      ];
    }
    if (qLower.includes('spec') || qLower.includes('parameter') || qLower.includes('frequency')) {
      return [
        'How are these specifications validated?',
        'What happens under worst-case timing or overflow?',
        'Explain the functional blocks involved.',
      ];
    }
    return [
      'Explain the working principle in detail.',
      'What are the known limitations or constraints?',
      'What formulas or equations govern this mechanism?',
    ];
  }

  /**
   * Generates comprehensive technical summary for the document
   */
  public async generateSummary(
    document: DocumentMetadata,
    chunks: DocumentChunk[]
  ): Promise<DocumentSummaryData> {
    // Pick representative chunks (first chunk, middle chunks, specs chunk)
    const sampledContent = chunks
      .slice(0, 10)
      .map((c) => `[Page ${c.pageNumber} - ${c.sectionTitle}]\n${c.content}`)
      .join('\n\n');

    const prompt = `Analyze this technical document and generate a structured engineering summary.
Document Title: "${document.title}" (File: ${document.fileName})

Document Content Samples:
${sampledContent}

You must return valid JSON matching the exact schema.`;

    const modelsToTry = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];
    let lastError: any = null;

    for (const modelName of modelsToTry) {
      try {
        const response = await this.ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                shortOverview: {
                  type: Type.STRING,
                  description: 'Executive technical summary of the document (2-3 paragraphs)',
                },
                importantConcepts: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'List of foundational concepts, mechanisms, or principles',
                },
                keySpecifications: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      label: { type: Type.STRING },
                      value: { type: Type.STRING },
                      unit: { type: Type.STRING },
                    },
                    required: ['label', 'value'],
                  },
                  description: 'Numerical specs, frequencies, bit widths, limits, or tolerances',
                },
                importantComponents: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      role: { type: Type.STRING },
                      details: { type: Type.STRING },
                    },
                    required: ['name', 'role'],
                  },
                  description: 'Principal hardware or software modules, state machines, or components',
                },
                formulasAndParameters: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      formulaOrValue: { type: Type.STRING },
                      note: { type: Type.STRING },
                    },
                    required: ['name', 'formulaOrValue'],
                  },
                  description: 'Mathematical formulas, equations, or timing invariants',
                },
                conclusionsAndLimitations: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Design limitations, constraints, and operational boundaries',
                },
              },
              required: [
                'shortOverview',
                'importantConcepts',
                'keySpecifications',
                'importantComponents',
                'formulasAndParameters',
                'conclusionsAndLimitations',
              ],
            },
          },
        });

        const parsed = JSON.parse(response.text?.trim() || '{}');
        return {
          shortOverview: parsed.shortOverview || 'Technical document summary generated by TechRAG.',
          importantConcepts: parsed.importantConcepts || [],
          keySpecifications: parsed.keySpecifications || [],
          importantComponents: parsed.importantComponents || [],
          formulasAndParameters: parsed.formulasAndParameters || [],
          conclusionsAndLimitations: parsed.conclusionsAndLimitations || [],
          generatedAt: new Date().toISOString(),
        };
      } catch (err: any) {
        lastError = err;
        console.warn(`Summary generation on ${modelName} encountered issue, trying fallback...`);
        await new Promise((r) => setTimeout(r, 600));
      }
    }

    console.error('All summary models failed, returning fallback summary:', lastError);
    // Fallback summary
    return {
      shortOverview: `Overview for ${document.title}: This document details architecture, timing constraints, and component interfaces across ${document.pageCount} pages.`,
      importantConcepts: ['System Architecture', 'Operating Modes', 'Interface Specifications'],
      keySpecifications: [
        { label: 'Page Count', value: `${document.pageCount}`, unit: 'pages' },
        { label: 'Total Words', value: `${document.wordCount}`, unit: 'words' },
        { label: 'Processed Chunks', value: `${document.chunkCount}`, unit: 'chunks' },
      ],
      importantComponents: [{ name: 'Core Engine', role: 'Main operational module described in document' }],
      formulasAndParameters: [{ name: 'Throughput', formulaOrValue: 'See document for exact timing diagrams' }],
      conclusionsAndLimitations: ['Refer to specific sections for detailed operating conditions.'],
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Generates dynamic suggested questions tailored to the document's content
   */
  public async generateSuggestedQuestions(
    document: DocumentMetadata,
    chunks: DocumentChunk[]
  ): Promise<string[]> {
    const baseQuestions = [
      'What is the main purpose of this design?',
      'Explain the architecture of this system.',
      'What are the important specifications?',
      'Explain the working principle.',
      'What are the limitations and constraints?',
      "Explain this document like I'm a beginner.",
    ];

    try {
      const sample = chunks
        .slice(0, 5)
        .map((c) => c.content)
        .join('\n')
        .slice(0, 1200);

      const response = await this.ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Based on this technical document, suggest 4 specific, high-value technical questions an engineer would ask:
Title: ${document.title}
Text Sample: ${sample}`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
      });

      const dynamicQuestions: string[] = JSON.parse(response.text?.trim() || '[]');
      if (Array.isArray(dynamicQuestions) && dynamicQuestions.length > 0) {
        return [...baseQuestions.slice(0, 4), ...dynamicQuestions.slice(0, 3), baseQuestions[5]];
      }
    } catch {
      // Fallback to base questions
    }
    return baseQuestions;
  }
}
