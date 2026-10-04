import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { execFile } from 'child_process';
import { randomUUID } from 'crypto';
import { promisify } from 'util';
import sharp from 'sharp';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { OllamaService } from './ollama.js';

const execFileAsync = promisify(execFile);

const MAX_PDF_PAGES = 5;
// Below this many characters, a page's embedded text layer is treated as absent (scanned page) rather than sparse
const MIN_TEXT_LENGTH_PER_PAGE = 20;

export class FileProcessor {
  constructor(private ollama: OllamaService) {}

  async createImageThumbnail(filePath: string): Promise<Buffer> {
    return sharp(filePath).resize(200, 200, { fit: 'cover' }).jpeg({ quality: 80 }).toBuffer();
  }

  async processText(filePath: string): Promise<{ content: string; thumbnail: Buffer }> {
    const fileContent = await fs.readFile(filePath, 'utf-8');

    const thumbnail = await this.generatePlaceholderThumbnail();

    return {
      content: fileContent,
      thumbnail,
    };
  }

  async processPDF(
    filePath: string,
  ): Promise<{ content: string; pageCount: number; thumbnail: Buffer; ocrUsed: boolean }> {
    let pdf;
    let pageCount = 1;

    try {
      const pdfData = await fs.readFile(filePath);
      // pdfjs requires a Uint8Array, not a Node Buffer
      pdf = await pdfjs.getDocument({ data: new Uint8Array(pdfData) }).promise;
      pageCount = pdf.numPages;
    } catch (error) {
      console.error('Failed to load PDF with pdfjs:', error);
      const thumbnail = await this.generatePlaceholderThumbnail();
      return { content: 'PDF file', pageCount: 1, thumbnail, ocrUsed: false };
    }

    const pagesToRead = Math.min(pageCount, MAX_PDF_PAGES);
    const pageTexts: string[] = [];

    for (let i = 1; i <= pagesToRead; i++) {
      try {
        const page = await pdf.getPage(i);
        const text = await page.getTextContent();
        pageTexts.push(
          text.items
            .map(item => ('str' in item ? item.str : ''))
            .join(' ')
            .trim(),
        );
      } catch (error) {
        console.error(`Failed to extract text from PDF page ${i}:`, error);
        pageTexts.push('');
      }
    }

    let textContent: string;
    let ocrUsed = false;
    if (pageTexts.some(t => t.length >= MIN_TEXT_LENGTH_PER_PAGE)) {
      textContent = pageTexts.join('\n');
    } else {
      console.log('No embedded text layer found in PDF, falling back to AI vision transcription');
      ocrUsed = true;
      textContent = await this.transcribePdfPagesWithVision(filePath, pagesToRead);
    }

    const thumbnail = await this.generatePlaceholderThumbnail();

    return {
      content: textContent || 'PDF file',
      pageCount,
      thumbnail,
      ocrUsed,
    };
  }

  private async transcribePdfPagesWithVision(pdfPath: string, pageCount: number): Promise<string> {
    const pageTexts: string[] = [];

    for (let i = 1; i <= pageCount; i++) {
      const imagePrefix = path.join(os.tmpdir(), `ocr-${path.basename(pdfPath, path.extname(pdfPath))}-${i}`);
      const imagePath = `${imagePrefix}.png`;
      try {
        await execFileAsync('pdftoppm', [
          '-png',
          '-r',
          '200',
          '-f',
          String(i),
          '-l',
          String(i),
          '-singlefile',
          pdfPath,
          imagePrefix,
        ]);
        const text = await this.ollama.transcribeImage(imagePath);
        pageTexts.push(text.trim());
      } catch (error) {
        console.error(`Vision transcription failed for PDF page ${i}:`, error);
      } finally {
        await fs.unlink(imagePath).catch(() => {});
      }
    }

    return pageTexts.filter(Boolean).join('\n');
  }

  // The top of the first page as a 200x200 JPEG (the upper part of a document
  // is the most recognizable: letterhead, title, form header).
  async renderPdfThumbnail(pdfPath: string): Promise<Buffer> {
    const imagePrefix = path.join(os.tmpdir(), `thumb-${randomUUID()}`);
    const imagePath = `${imagePrefix}.png`;
    try {
      await execFileAsync('pdftoppm', [
        '-png',
        '-f',
        '1',
        '-l',
        '1',
        '-singlefile',
        '-scale-to',
        '400',
        pdfPath,
        imagePrefix,
      ]);
      return await sharp(imagePath)
        .resize(200, 200, { fit: 'cover', position: 'top' })
        .jpeg({ quality: 80 })
        .toBuffer();
    } finally {
      await fs.unlink(imagePath).catch(() => {});
    }
  }

  // A plain blue square. The UI shows file-type icons for text files and renders
  // PDF thumbnails on demand (renderPdfThumbnail), so this is only a fallback.
  private async generatePlaceholderThumbnail(): Promise<Buffer> {
    return sharp({
      create: {
        width: 200,
        height: 200,
        channels: 3,
        background: { r: 59, g: 130, b: 246 }, // blue
      },
    })
      .jpeg({ quality: 80 })
      .toBuffer();
  }
}
