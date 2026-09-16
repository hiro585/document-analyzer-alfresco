import axios from 'axios';

const OLLAMA_API_URL = 'http://localhost:11434/api';

interface OllamaModel {
  name: string;
  model: string;
}

interface OllamaGenerateResponse {
  model: string;
  response: string;
  done: boolean;
}

export class OllamaService {
  private selectedModel: string | null = null;

  async detectModels(): Promise<string[]> {
    try {
      const response = await axios.get(`${OLLAMA_API_URL}/tags`);
      const models = response.data.models.map((m: OllamaModel) => m.name);
      console.log('Available Ollama models:', models);
      return models;
    } catch (error) {
      console.error('Failed to detect Ollama models:', error);
      throw new Error('Could not connect to Ollama. Make sure Ollama is running on http://localhost:11434');
    }
  }

  async selectModel(): Promise<string> {
    if (this.selectedModel) return this.selectedModel;

    const models = await this.detectModels();
    if (models.length === 0) {
      throw new Error('No models found in Ollama. Run: ollama run llava');
    }

    // Prefer LLaVA (vision model), then Mistral, fall back to others
    const preferred = models.find(m => m.includes('llava')) ||
                     models.find(m => m.includes('mistral')) ||
                     models.find(m => m.includes('llama')) ||
                     models[0];

    this.selectedModel = preferred;
    console.log(`Selected model: ${this.selectedModel}`);
    return this.selectedModel;
  }

  async extractData(fileContent: string, prompt: string): Promise<Record<string, any>> {
    const model = await this.selectModel();

    const fullPrompt = `${prompt}\n\nContent to analyze:\n${fileContent}\n\nProvide the extracted information in a structured format.`;

    try {
      const response = await axios.post(`${OLLAMA_API_URL}/generate`, {
        model,
        prompt: fullPrompt,
        stream: false,
      });

      const extractedText = response.data.response;
      return this.parseExtractedData(extractedText);
    } catch (error) {
      console.error('Ollama extraction error:', error);
      throw new Error('Failed to extract data from document');
    }
  }

  async chat(query: string, documentContexts: string[]): Promise<string> {
    const model = await this.selectModel();

    const context = documentContexts.map((ctx, i) => `Document ${i + 1}:\n${ctx}`).join('\n\n');
    const fullPrompt = `Based on these documents:\n\n${context}\n\nAnswer the following question:\n${query}`;

    try {
      const response = await axios.post(`${OLLAMA_API_URL}/generate`, {
        model,
        prompt: fullPrompt,
        stream: false,
      });

      return response.data.response;
    } catch (error) {
      console.error('Ollama chat error:', error);
      throw new Error('Failed to process chat query');
    }
  }

  async extractDataFromImage(imagePath: string, prompt: string): Promise<Record<string, any>> {
    const model = await this.selectModel();
    const fs = await import('fs/promises');

    try {
      // Read image and convert to base64
      const imageData = await fs.readFile(imagePath);
      const base64Image = imageData.toString('base64');

      // Create prompt that tells LLaVA to analyze the image
      const fullPrompt = `${prompt}\n\nAnalyze the provided image and extract the requested information. Provide the extracted information in a structured format.`;

      const response = await axios.post(`${OLLAMA_API_URL}/generate`, {
        model,
        prompt: fullPrompt,
        images: [base64Image],
        stream: false,
      });

      const extractedText = response.data.response;
      return this.parseExtractedData(extractedText);
    } catch (error) {
      console.error('Ollama image extraction error:', error);
      throw new Error('Failed to extract data from image');
    }
  }

  private parseExtractedData(text: string): Record<string, any> {
    // Try to parse as JSON first
    try {
      return JSON.parse(text);
    } catch (e) {
      // If not JSON, parse as key: value pairs or return as plain text
      const result: Record<string, any> = {};
      const lines = text.split('\n').filter(l => l.trim());
      let foundKeyValue = false;

      lines.forEach(line => {
        const match = line.match(/^([^:]+):\s*(.+)$/);
        if (match) {
          result[match[1].toLowerCase().replace(/\s+/g, '_')] = match[2].trim();
          foundKeyValue = true;
        }
      });

      // If no key:value pairs found, return the entire text as "content"
      if (!foundKeyValue && lines.length > 0) {
        return { content: text.trim() };
      }

      return Object.keys(result).length > 0 ? result : { content: text.trim() };
    }
  }
}

export const ollamaService = new OllamaService();
