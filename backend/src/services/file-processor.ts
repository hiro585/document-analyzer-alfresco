import * as fs from 'fs/promises';
import * as path from 'path';
import sharp from 'sharp';
import * as pdfjs from 'pdfjs-dist';

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

export class FileProcessor {
  async processImage(filePath: string): Promise<{ content: string; thumbnail: Buffer }> {
    const fileContent = await fs.readFile(filePath);
    const base64Content = fileContent.toString('base64');

    // Generate thumbnail
    const thumbnail = await sharp(filePath)
      .resize(200, 200, { fit: 'cover' })
      .jpeg({ quality: 80 })
      .toBuffer();

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

  async processPDF(filePath: string): Promise<{ content: string; pageCount: number; thumbnail: Buffer }> {
    try {
      const pdfData = await fs.readFile(filePath);
      let textContent = `[PDF file: ${pdfData.length} bytes]`;
      let pageCount = 1;

      try {
        const pdf = await pdfjs.getDocument({ data: pdfData }).promise;
        pageCount = pdf.numPages;
        const textContent_extracted: string[] = [];

        for (let i = 1; i <= Math.min(pageCount, 5); i++) {
          const page = await pdf.getPage(i);
          const text = await page.getTextContent();
          const pageText = text.items
            .map((item: any) => item.str)
            .join(' ');
          textContent_extracted.push(pageText);
        }

        if (textContent_extracted.length > 0) {
          textContent = textContent_extracted.join('\n');
        }
      } catch (e) {
        console.log('PDF text extraction skipped, using file info as-is');
      }

      const thumbnail = await this.generateSimpleThumbnail(`PDF - ${pageCount} page${pageCount > 1 ? 's' : ''}`);

      return {
        content: textContent,
        pageCount,
        thumbnail,
      };
    } catch (error) {
      console.error('PDF processing error:', error);
      const thumbnail = await this.generateSimpleThumbnail('PDF');
      return {
        content: 'PDF file',
        pageCount: 1,
        thumbnail,
      };
    }
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

export const fileProcessor = new FileProcessor();
