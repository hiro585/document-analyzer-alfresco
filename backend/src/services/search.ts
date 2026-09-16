import { Document } from '../types/index.js';
import { StorageService } from './storage.js';

export class SearchService {
  constructor(private storage: StorageService) {}

  async keywordSearch(query: string): Promise<Document[]> {
    const index = await this.storage.loadIndex();
    const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 0);

    const matchedDocIds = new Set<string>();

    for (const term of queryTerms) {
      // Exact match
      if (index.keywords[term]) {
        index.keywords[term].forEach(id => matchedDocIds.add(id));
      }

      // Partial match (keyword contains search term)
      for (const keyword in index.keywords) {
        if (keyword.includes(term)) {
          index.keywords[keyword].forEach(id => matchedDocIds.add(id));
        }
      }
    }

    const documents = await this.storage.listDocuments();
    return documents.filter(doc => matchedDocIds.has(doc.id));
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
}
