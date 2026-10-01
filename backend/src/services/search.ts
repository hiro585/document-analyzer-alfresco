import { Document } from '../types/index.js';
import { StorageService } from './storage.js';

const CJK_PATTERN = /[぀-ヿ㐀-鿿]/;
const ASCII_WORD_PATTERN = /[a-z0-9]+/g;
const CJK_RUN_PATTERN = /[぀-ヿ㐀-鿿]+/g;

// CJK text has no spaces between words, so it's tokenized into whole
// contiguous runs and matched by substring; ASCII text is tokenized into
// words and matched by whole-word/prefix, so a term like "term" doesn't
// false-positive against unrelated words like "determine" or "watermark".
function tokenize(text: string): { words: Set<string>; cjkRuns: string[] } {
  const lower = text.toLowerCase();
  return {
    words: new Set(lower.match(ASCII_WORD_PATTERN) || []),
    cjkRuns: lower.match(CJK_RUN_PATTERN) || [],
  };
}

// Overlap of two token sets as a fraction (0-1): shared tokens over all distinct tokens.
function jaccardSimilarity(
  a: { words: Set<string>; cjkRuns: string[] },
  b: { words: Set<string>; cjkRuns: string[] },
): number {
  const setA = new Set([...a.words, ...a.cjkRuns]);
  const setB = new Set([...b.words, ...b.cjkRuns]);
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection++;
  }
  return intersection / (setA.size + setB.size - intersection);
}

function documentBagOfWords(doc: { filename: string; keywords: string[]; extractedData: Record<string, any> }): string {
  return [
    doc.filename,
    ...doc.keywords,
    ...Object.values(doc.extractedData || {}).map(v => (typeof v === 'string' ? v : JSON.stringify(v))),
  ].join(' ');
}

function matchesTerm(term: string, tokens: { words: Set<string>; cjkRuns: string[] }): boolean {
  if (CJK_PATTERN.test(term)) {
    return tokens.cjkRuns.some(run => run.includes(term));
  }
  if (tokens.words.has(term)) return true;
  for (const word of tokens.words) {
    if (word.startsWith(term)) return true;
  }
  return false;
}

// Japanese (and other CJK) queries have no spaces, so whitespace-splitting
// alone leaves one long unsegmented run that will almost never substring-match
// a document. Without a real tokenizer, sliding 3-4 char windows over each CJK
// run approximates word-sized chunks (shorter windows are mostly grammatical
// particles common to nearly every sentence, so they're skipped to keep the
// "no relevant documents" signal meaningful).
export function expandQueryTerms(rawTerms: string[]): string[] {
  const expanded = new Set<string>();
  for (const term of rawTerms) {
    expanded.add(term);
    if (CJK_PATTERN.test(term)) {
      for (const run of term.match(CJK_RUN_PATTERN) || []) {
        for (let len = 3; len <= Math.min(4, run.length); len++) {
          for (let i = 0; i <= run.length - len; i++) {
            expanded.add(run.slice(i, i + len));
          }
        }
      }
    }
  }
  return [...expanded];
}

export class SearchService {
  constructor(private storage: StorageService) {}

  // Ranks `candidates` (all stored documents when omitted) by keyword overlap with the query.
  async findRelevantDocuments(query: string, limit: number, candidates?: Document[]): Promise<Document[]> {
    const documents = candidates ?? (await this.storage.listDocuments());
    const rawTerms = query
      .toLowerCase()
      .split(/\s+/)
      .filter(t => t.length > 0);
    if (rawTerms.length === 0) return [];
    const queryTerms = expandQueryTerms(rawTerms);

    const scored = documents.map(doc => {
      const keywordTokens = tokenize(doc.keywords.join(' '));
      const descriptionTokens = tokenize(
        [
          doc.filename,
          doc.originalPrompt,
          ...Object.values(doc.extractedData || {}).map(v => (typeof v === 'string' ? v : JSON.stringify(v))),
        ].join(' '),
      );

      let score = 0;
      for (const term of queryTerms) {
        const exactKeywordMatch = doc.keywords.some(k => k.toLowerCase() === term);
        if (exactKeywordMatch) score += 3;
        else if (matchesTerm(term, keywordTokens)) score += 2;

        if (matchesTerm(term, descriptionTokens)) score += 1;
      }

      return { doc, score };
    });

    return scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(s => s.doc);
  }

  // Picks the documents to hand to the model for a chat question. When the
  // user scoped the chat (picked documents / search results) and there are few
  // enough, all of them are used even without keyword overlap (e.g.
  // "summarize these"); otherwise they're ranked, and a scoped chat falls back
  // to the first `limit` candidates rather than answering "no match".
  async pickChatDocuments<T extends Document>(
    query: string,
    candidates: T[],
    scoped: boolean,
    limit: number,
  ): Promise<T[]> {
    if (scoped && candidates.length <= limit) return candidates;
    const ranked = (await this.findRelevantDocuments(query, limit, candidates)) as T[];
    if (ranked.length === 0 && scoped) return candidates.slice(0, limit);
    return ranked;
  }

  // Finds already-stored documents whose keywords/summary text significantly
  // overlap with the given candidate, for the "similar document" check agent.
  // Plain text/keyword overlap only — no AI model call.
  async findSimilarDocuments(
    candidate: { filename: string; keywords: string[]; extractedData: Record<string, any> },
    limit = 5,
    minScore = 0.1,
  ): Promise<{ doc: Document; score: number }[]> {
    const documents = await this.storage.listDocuments();
    const candidateTokens = tokenize(documentBagOfWords(candidate));

    return documents
      .map(doc => ({ doc, score: jaccardSimilarity(candidateTokens, tokenize(documentBagOfWords(doc))) }))
      .filter(s => s.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  getDocumentContext(doc: Document): string {
    const lines: string[] = [];
    lines.push(`File: ${doc.filename}`);
    lines.push(`Uploaded: ${doc.uploadedAt}`);
    lines.push(`Extraction Prompt: ${doc.originalPrompt}`);
    lines.push('Extracted Data:');

    for (const [key, value] of Object.entries(doc.extractedData)) {
      lines.push(`  ${key}: ${JSON.stringify(value)}`);
    }

    return lines.join('\n');
  }

  getDocumentSummary(doc: Document, maxLength = 160): string {
    const text = Object.values(doc.extractedData || {})
      .map(v => (typeof v === 'string' ? v : JSON.stringify(v)))
      .filter(v => v && v.trim().length > 0)
      .join(' ')
      .trim();

    if (!text) return doc.originalPrompt || '';
    return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
  }
}
