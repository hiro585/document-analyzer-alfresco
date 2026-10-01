import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { OllamaService } from './ollama.js';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MAX_PDF_PAGES = 5;
// Below this many characters, a page's embedded text layer is treated as absent (scanned page) rather than sparse
const MIN_TEXT_LENGTH_PER_PAGE = 20;

export class FileProcessor {
  constructor(private ollama: OllamaService) {}

  async processImage(filePath: string): Promise<{ content: string; thumbnail: Buffer }> {
    const fileContent = await fs.readFile(filePath);
    const base64Content = fileContent.toString('base64');

    // Generate thumbnail
    const thumbnail = await sharp(filePath).resize(200, 200, { fit: 'cover' }).jpeg({ quality: 80 }).toBuffer();

    return {
      content: base64Content,
      thumbnail,
    };
  }

  async processText(filePath: string): Promise<{ content: string; thumbnail: Buffer }> {
    const fileContent = await fs.readFile(filePath, 'utf-8');

    // Generate text file thumbnail
    const thumbnail = await this.generateSimpleThumbnail('📝 TXT');

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
      const thumbnail = await this.generateSimpleThumbnail('PDF');
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

    const thumbnail = await this.generateSimpleThumbnail(`PDF - ${pageCount} page${pageCount > 1 ? 's' : ''}`);

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

  private async generateSimpleThumbnail(text: string): Promise<Buffer> {
    // Create a simple colored thumbnail using sharp
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

  async saveThumbnail(docId: string, thumbnail: Buffer, dataDir: string): Promise<void> {
    const thumbnailPath = path.join(dataDir, 'documents', docId, 'thumbnail.jpg');
    await fs.writeFile(thumbnailPath, thumbnail);
  }
}
