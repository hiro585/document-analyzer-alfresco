import * as fs from 'fs/promises';
import * as path from 'path';
import { Document, PromptStore, SearchIndex } from '../types/index.js';

// Document ids are UUIDs. Ids come from request URLs, so anything else (e.g.
// "..") is rejected before it can become part of a filesystem path.
const DOC_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidDocumentId(docId: string): boolean {
  return DOC_ID_PATTERN.test(docId);
}

export class StorageService {
  constructor(private dataDir: string) {}

  private docDir(docId: string): string {
    if (!isValidDocumentId(docId)) {
      throw new Error(`Invalid document id: ${docId}`);
    }
    return path.join(this.dataDir, 'documents', docId);
  }

  async initializeStorage(): Promise<void> {
    const dirs = [path.join(this.dataDir, 'documents')];

    for (const dir of dirs) {
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (error) {
        console.error(`Failed to create directory ${dir}:`, error);
      }
    }

    // Initialize prompts.json if not exists
    const promptsPath = path.join(this.dataDir, 'prompts.json');
    try {
      await fs.access(promptsPath);
    } catch {
      const defaultPrompts: PromptStore = {
        templates: [
          {
            id: '1',
            name: 'Extract Numbers',
            prompt: 'Extract all numbers, amounts, and numerical values from this document.',
            isTemplate: true,
            translations: {
              ja: {
                name: '数字を抽出',
                prompt: 'このドキュメントからすべての数字、金額、および数値を抽出してください。',
              },
            },
          },
          {
            id: '2',
            name: 'Extract Names & Organizations',
            prompt: 'Find and extract all names of people and organizations mentioned in this document.',
            isTemplate: true,
            translations: {
              ja: {
                name: '名前と組織を抽出',
                prompt: 'このドキュメントで言及されている人々と組織のすべての名前を検索して抽出してください。',
              },
            },
          },
          {
            id: '3',
            name: 'Summarize Document',
            prompt:
              'Provide a concise summary of the main content of this document. Include all key details exactly as written, including handwritten notes, signatures, dates, and amounts — do not omit them for the sake of brevity.',
            isTemplate: true,
            translations: {
              ja: {
                name: 'ドキュメントを要約',
                prompt:
                  'このドキュメントの主な内容の簡潔な要約を提供してください。手書きのメモ、署名、日付、金額などの重要な詳細は、簡潔さのために省略せず、記載されているとおりにすべて含めてください。',
              },
            },
          },
          {
            id: '4',
            name: 'Extract Key Information',
            prompt: 'Extract the most important information from this document in a structured format.',
            isTemplate: true,
            translations: {
              ja: {
                name: '重要な情報を抽出',
                prompt: 'このドキュメントから最も重要な情報を構造化された形式で抽出してください。',
              },
            },
          },
        ],
        custom: [],
      };
      await this.savePrompts(defaultPrompts);
    }

    // Initialize index.json if not exists
    const indexPath = path.join(this.dataDir, 'index.json');
    try {
      await fs.access(indexPath);
    } catch {
      await this.saveIndex({ keywords: {} });
    }
  }

  async saveDocument(doc: Document): Promise<void> {
    const docDir = this.docDir(doc.id);
    await fs.mkdir(docDir, { recursive: true });

    const metadataPath = path.join(docDir, 'metadata.json');
    await fs.writeFile(metadataPath, JSON.stringify(doc, null, 2));

    // Update index
    await this.indexDocument(doc);
  }

  async loadDocument(docId: string): Promise<Document | null> {
    if (!isValidDocumentId(docId)) return null;
    const metadataPath = path.join(this.docDir(docId), 'metadata.json');
    try {
      const data = await fs.readFile(metadataPath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  async listDocuments(): Promise<Document[]> {
    const docsDir = path.join(this.dataDir, 'documents');
    const docIds = await fs.readdir(docsDir);
    const docs: Document[] = [];

    for (const docId of docIds) {
      const doc = await this.loadDocument(docId);
      if (doc) docs.push(doc);
    }

    return docs.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
  }

  async deleteDocument(docId: string): Promise<void> {
    const docDir = this.docDir(docId);
    await fs.rm(docDir, { recursive: true, force: true });

    // Remove from index
    const index = await this.loadIndex();
    for (const keyword in index.keywords) {
      index.keywords[keyword] = index.keywords[keyword].filter(id => id !== docId);
      if (index.keywords[keyword].length === 0) delete index.keywords[keyword];
    }
    await this.saveIndex(index);
  }

  async savePrompts(prompts: PromptStore): Promise<void> {
    const promptsPath = path.join(this.dataDir, 'prompts.json');
    await fs.writeFile(promptsPath, JSON.stringify(prompts, null, 2));
  }

  async loadPrompts(): Promise<PromptStore> {
    const promptsPath = path.join(this.dataDir, 'prompts.json');
    try {
      const data = await fs.readFile(promptsPath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return { templates: [], custom: [] };
    }
  }

  async saveOriginalFile(docId: string, filePath: string, originalFileName: string): Promise<void> {
    const ext = path.extname(originalFileName);
    const docDir = this.docDir(docId);
    const destPath = path.join(docDir, `original${ext}`);
    await fs.copyFile(filePath, destPath);
  }

  async saveThumbnail(docId: string, thumbnail: Buffer): Promise<void> {
    const docDir = this.docDir(docId);
    await fs.mkdir(docDir, { recursive: true });
    const thumbnailPath = path.join(docDir, 'thumbnail.jpg');
    await fs.writeFile(thumbnailPath, thumbnail);
  }

  async getThumbnailPath(docId: string): Promise<string> {
    return path.join(this.docDir(docId), 'thumbnail.jpg');
  }

  // First-page thumbnail for PDFs, rendered on first request (the thumbnail.jpg
  // saved at upload is only a plain placeholder for PDFs).
  getPdfThumbnailPath(docId: string): string {
    return path.join(this.docDir(docId), 'pdf-thumbnail.jpg');
  }

  async getOriginalFilePath(docId: string): Promise<string | null> {
    if (!isValidDocumentId(docId)) return null;
    const docDir = this.docDir(docId);
    try {
      const files = await fs.readdir(docDir);
      const original = files.find(f => f.startsWith('original'));
      return original ? path.join(docDir, original) : null;
    } catch {
      return null;
    }
  }

  private async indexDocument(doc: Document): Promise<void> {
    const index = await this.loadIndex();

    doc.keywords.forEach(keyword => {
      const lower = keyword.toLowerCase();
      if (!index.keywords[lower]) {
        index.keywords[lower] = [];
      }
      if (!index.keywords[lower].includes(doc.id)) {
        index.keywords[lower].push(doc.id);
      }
    });

    await this.saveIndex(index);
  }

  private async saveIndex(index: SearchIndex): Promise<void> {
    const indexPath = path.join(this.dataDir, 'index.json');
    await fs.writeFile(indexPath, JSON.stringify(index, null, 2));
  }

  async loadIndex(): Promise<SearchIndex> {
    const indexPath = path.join(this.dataDir, 'index.json');
    try {
      const data = await fs.readFile(indexPath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return { keywords: {} };
    }
  }
}
