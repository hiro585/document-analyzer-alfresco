import axios from 'axios';
import sharp from 'sharp';
import { OLLAMA_API_URL, OLLAMA_MODEL, OLLAMA_URL } from '../config/env.js';
import { buildSystemPrompt } from '../utils/systemPrompt.js';
import type { Language } from '../utils/systemPrompt.js';

const MODEL_INSTALL_HINT = 'ollama pull gemma3:4b (or qwen3-vl:4b-instruct)';

// Requests to Ollama go through this client so that "connection refused"-style
// failures say what to do instead of e.g. "connect ECONNREFUSED 127.0.0.1:11434".
const ollamaClient = axios.create();
ollamaClient.interceptors.response.use(undefined, error => {
  if (axios.isAxiosError(error) && !error.response) {
    return Promise.reject(new Error(`Could not connect to Ollama at ${OLLAMA_URL}. Make sure Ollama is running.`));
  }
  return Promise.reject(error);
});

export type OllamaStatus =
  | { available: true; model: string }
  | {
      available: false;
      reason: 'unreachable' | 'no_models' | 'model_not_set' | 'model_missing';
      message: string;
      model?: string;
      // Models Ollama has, to choose from in OLLAMA_MODEL
      installed?: string[];
    };

// Discourage the model from looping on repeated phrases. Ollama only applies
// sampling settings when they are nested under `options`.
const REPETITION_OPTIONS = { repeat_penalty: 1.15, repeat_last_n: 64 };

// Vision models turn every image tile into tokens, so large scans are very slow
// on CPU. Downscale so the longest side is at most this many pixels.
const MAX_IMAGE_DIMENSION = 1280;

interface OllamaModel {
  name: string;
  model: string;
}

const agentFailedMessage = (language: Language) =>
  language === 'ja' ? 'このエージェントを実行できませんでした。' : 'Failed to run this agent.';

export interface AgentCheckResult {
  status: 'pass' | 'issues_found' | 'error';
  summary: string;
  findings: string[];
}

export class OllamaService {
  private selectedModel: string | null = null;

  async detectModels(): Promise<string[]> {
    try {
      return await this.fetchInstalledModels();
    } catch (error) {
      console.error('Failed to detect Ollama models:', error instanceof Error ? error.message : error);
      throw error;
    }
  }

  private async fetchInstalledModels(): Promise<string[]> {
    const response = await ollamaClient.get(`${OLLAMA_API_URL}/tags`);
    return response.data.models.map((m: OllamaModel) => m.name);
  }

  // The model set in OLLAMA_MODEL, or why it can't be used. There's no automatic
  // choice: the model must be chosen explicitly.
  private chooseModel(models: string[]): OllamaStatus {
    if (models.length === 0) {
      return {
        available: false,
        reason: 'no_models',
        message: `No models are installed in Ollama. Install one, e.g.: ${MODEL_INSTALL_HINT}, then set OLLAMA_MODEL in .env and restart the backend.`,
      };
    }

    if (!OLLAMA_MODEL) {
      return {
        available: false,
        reason: 'model_not_set',
        installed: models,
        message: `No AI model is selected. Set OLLAMA_MODEL in .env to one of the installed models (${models.join(', ')}) and restart the backend.`,
      };
    }

    // Accept "gemma3" as shorthand for "gemma3:latest", as the Ollama CLI does
    const configured = models.find(m => m === OLLAMA_MODEL || m === `${OLLAMA_MODEL}:latest`);
    if (!configured) {
      return {
        available: false,
        reason: 'model_missing',
        model: OLLAMA_MODEL,
        installed: models,
        message: `OLLAMA_MODEL "${OLLAMA_MODEL}" is not installed in Ollama. Run: ollama pull ${OLLAMA_MODEL}, or set OLLAMA_MODEL in .env to an installed model (${models.join(', ')}) and restart the backend.`,
      };
    }
    return { available: true, model: configured };
  }

  async selectModel(): Promise<string> {
    if (this.selectedModel) return this.selectedModel;

    const choice = this.chooseModel(await this.detectModels());
    if (!choice.available) throw new Error(choice.message);
    this.selectedModel = choice.model;
    return this.selectedModel;
  }

  // Checks Ollama afresh every time (unlike selectModel, which remembers its
  // choice), so the UI can tell when it stops or comes back.
  async checkStatus(): Promise<OllamaStatus> {
    let models: string[];
    try {
      models = await this.fetchInstalledModels();
    } catch (error) {
      return {
        available: false,
        reason: 'unreachable',
        message: error instanceof Error ? error.message : `Could not connect to Ollama at ${OLLAMA_URL}.`,
      };
    }
    return this.chooseModel(models);
  }

  // Uses /api/chat rather than /api/generate for better system prompt handling
  private async chatRequest(
    model: string,
    systemPrompt: string,
    userPrompt: string,
    temperature: number,
  ): Promise<string> {
    const response = await ollamaClient.post(`${OLLAMA_API_URL}/chat`, {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      stream: false,
      options: { ...REPETITION_OPTIONS, temperature },
    });
    return response.data.message.content;
  }

  // Reads an image, applies EXIF rotation, downscales it and returns base64 JPEG
  private async loadImageBase64(imagePath: string): Promise<string> {
    const buffer = await sharp(imagePath)
      .rotate()
      .resize(MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 90 })
      .toBuffer();
    return buffer.toString('base64');
  }

  async extractData(fileContent: string, prompt: string, language: Language = 'en'): Promise<Record<string, any>> {
    const model = await this.selectModel();

    // Build system prompt and user prompt separately for better language instruction
    const systemPrompt = buildSystemPrompt(language);
    const userPrompt = `${prompt}\n\nContent to analyze:\n${fileContent}\n\nProvide the extracted information in a structured format.`;

    try {
      const content = await this.chatRequest(model, systemPrompt, userPrompt, 0.7);
      return this.parseExtractedData(content);
    } catch (error) {
      console.error('Ollama extraction error:', error);
      throw new Error('Failed to extract data from document');
    }
  }

  async chat(query: string, documentContexts: string[], language: Language = 'en'): Promise<string> {
    const model = await this.selectModel();

    // Build system prompt and user prompt separately for better language instruction
    const systemPrompt = buildSystemPrompt(language);
    const context = documentContexts.map((ctx, i) => `Document ${i + 1}:\n${ctx}`).join('\n\n');
    const userPrompt = `Based on these documents:\n\n${context}\n\n${language === 'ja' ? 'この質問に日本語で答えてください:' : 'Answer the following question:'}\n${query}`;

    try {
      return await this.chatRequest(model, systemPrompt, userPrompt, 0.7);
    } catch (error) {
      console.error('Ollama chat error:', error);
      throw new Error('Failed to process chat query');
    }
  }

  async extractDataFromImage(
    imagePath: string,
    prompt: string,
    language: Language = 'en',
  ): Promise<Record<string, any>> {
    const model = await this.selectModel();

    try {
      const base64Image = await this.loadImageBase64(imagePath);

      // Build language-aware prompt for image analysis
      const systemPrompt = buildSystemPrompt(language);
      const userPrompt = `${prompt}\n\nAnalyze the provided image and extract the requested information. Provide the response in a structured format.`;

      // Combine system and user prompts for /api/generate (which works with images)
      const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;

      // Use /api/generate for images (it works reliably with base64 images)
      const response = await ollamaClient.post(`${OLLAMA_API_URL}/generate`, {
        model,
        prompt: fullPrompt,
        images: [base64Image],
        stream: false,
        options: { ...REPETITION_OPTIONS, temperature: 0.7 },
      });

      const extractedText = response.data.response;
      return this.parseExtractedData(extractedText);
    } catch (error) {
      console.error('Ollama image extraction error:', error);
      throw new Error('Failed to extract data from image');
    }
  }

  /**
   * Transcribes all visible text in an image (including handwriting) using the
   * vision model, in place of a traditional OCR engine. Unlike extractDataFromImage,
   * this deliberately does NOT force a response language: transcription must
   * reproduce the document's original text as written, not translate it.
   */
  async transcribeImage(imagePath: string): Promise<string> {
    const model = await this.selectModel();

    try {
      const base64Image = await this.loadImageBase64(imagePath);

      const prompt = `Transcribe all text visible in this image exactly as it is written, including any handwriting.
The text may be in Japanese, English, or a mix of both — transcribe it in its original language and script. Do not translate it.
Preserve line breaks where they appear. Do not summarize, analyze, or add any commentary.
Respond with ONLY the transcribed text. If no text is visible, respond with an empty string.`;

      const response = await ollamaClient.post(`${OLLAMA_API_URL}/generate`, {
        model,
        prompt,
        images: [base64Image],
        stream: false,
        options: { ...REPETITION_OPTIONS, temperature: 0.2 },
      });

      return String(response.data.response || '').trim();
    } catch (error) {
      console.error('Ollama vision transcription error:', error);
      return '';
    }
  }

  async runRecordMatchEvaluation(
    summary: string,
    extractedText: string | undefined,
    referenceRecords: string,
    language: Language = 'en',
  ): Promise<AgentCheckResult> {
    const model = await this.selectModel();
    const documentContext = extractedText
      ? `Document summary (for structure/context):\n${summary}\n\nFull extracted document text (for detailed verification):\n${extractedText}`
      : `Document summary:\n${summary}`;
    const userPrompt = `${this.buildRecordMatchInstructions(language)}\n\n${documentContext}\n\nReference records (e.g. a registration list, CSV or plain text):\n${referenceRecords}`;

    try {
      const content = await this.chatRequest(model, buildSystemPrompt(language), userPrompt, 0.2);
      return this.parseAgentResult(content);
    } catch (error) {
      console.error('Ollama record match evaluation error:', error);
      return { status: 'error', summary: agentFailedMessage(language), findings: [] };
    }
  }

  private buildRecordMatchInstructions(language: Language): string {
    return language === 'ja'
      ? `あなたはドキュメントの情報を、提供された参照レコード一覧（例：登録リストのCSVまたはテキスト）と照合するAIエージェントです。
ドキュメントの情報が参照レコードのいずれかと一致するかどうかを判断してください。
一致するレコードが見つかった場合は、どのレコードと一致したか、また矛盾点があればそれを具体的に示してください。
一致するレコードが見つからない場合、または一致するレコードはあるが矛盾がある場合は "status": "issues_found" を使用してください。
一致するレコードが見つかり、矛盾がない場合のみ "status": "pass" を使用してください。
JSON形式のみで回答してください。説明や前置きは含めないでください。
形式: {"status": "pass又はissues_found", "summary": "判断の理由を1〜2文で（何を確認し、なぜ問題がある・ないと判断したか）", "findings": ["具体的な指摘事項", ...]}
"summary"はドキュメントの内容の要約ではなく、判断の理由を書いてください。問題がない場合も必ず書いてください。`
      : `You are an AI agent that checks whether a document's information matches any record in a provided reference list (e.g. a registration list, in CSV or plain text form).
Determine whether the document's data corresponds to one of the reference records.
If a matching record is found, identify which record it matches and note any specific discrepancies between the document and that record.
Use "status": "issues_found" if no matching record is found, or if a matching record is found but has discrepancies.
Use "status": "pass" only if a matching record is found with no discrepancies.
Respond with ONLY JSON in this exact shape, no preamble or explanation:
{"status": "pass or issues_found", "summary": "1-2 sentences explaining your conclusion: what you checked and why you did or did not find problems", "findings": ["specific finding 1", "specific finding 2"]}
"summary" must explain your reasoning, not summarize the document, and must not be empty, even when nothing was found.`;
  }

  async runAgentEvaluation(
    summary: string,
    extractedText: string | undefined,
    task: string,
    language: Language = 'en',
  ): Promise<AgentCheckResult> {
    const model = await this.selectModel();
    const context = extractedText
      ? `Document summary (use this to understand the overall structure):\n${summary}\n\nFull extracted document text (use this for detailed verification, including any handwritten content):\n${extractedText}`
      : `Document summary:\n${summary}`;
    const userPrompt = `${this.buildAgentInstructions(task, language)}\n\n${context}`;

    try {
      const content = await this.chatRequest(model, buildSystemPrompt(language), userPrompt, 0.3);
      return this.parseAgentResult(content);
    } catch (error) {
      console.error('Ollama agent evaluation error:', error);
      return { status: 'error', summary: agentFailedMessage(language), findings: [] };
    }
  }

  private buildAgentInstructions(task: string, language: Language): string {
    return language === 'ja'
      ? `あなたはドキュメントを検査するAIエージェントです。以下の情報（要約、および利用可能な場合は抽出された全文）に基づいて、次のタスクを実行してください: ${task}
問題が見つからない場合は "status": "pass" を、問題が見つかった場合は "status": "issues_found" を使用してください。
JSON形式のみで回答してください。説明や前置きは含めないでください。
形式: {"status": "pass又はissues_found", "summary": "判断の理由を1〜2文で（何を確認し、なぜ問題がある・ないと判断したか）", "findings": ["具体的な指摘事項", ...]}
"summary"はドキュメントの内容の要約ではなく、判断の理由を書いてください。問題がない場合も必ず書いてください。
問題がない場合、findingsは空配列にしてください。`
      : `You are an AI agent inspecting a document. Based on the information below (a summary, and where available the full extracted text), perform this task: ${task}
Use "status": "pass" if nothing concerning was found, or "status": "issues_found" if you found problems.
Respond with ONLY JSON in this exact shape, no preamble or explanation:
{"status": "pass or issues_found", "summary": "1-2 sentences explaining your conclusion: what you checked and why you did or did not find problems", "findings": ["specific finding 1", "specific finding 2"]}
"summary" must explain your reasoning, not summarize the document, and must not be empty, even when nothing was found.
If there are no issues, findings should be an empty array.`;
  }

  private parseAgentResult(text: string): AgentCheckResult {
    const objectMatch = text.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try {
        const parsed = JSON.parse(objectMatch[0]);
        const status: AgentCheckResult['status'] = parsed.status === 'issues_found' ? 'issues_found' : 'pass';
        const findings = Array.isArray(parsed.findings)
          ? parsed.findings.map((f: unknown) => String(f).trim()).filter(Boolean)
          : [];
        return {
          status,
          summary: typeof parsed.summary === 'string' ? parsed.summary.trim() : '',
          findings,
        };
      } catch (e) {
        // fall through
      }
    }

    // Model didn't return valid JSON — surface the raw text rather than losing it
    return { status: 'error', summary: text.trim().slice(0, 500), findings: [] };
  }

  async extractKeywords(text: string, language: Language = 'en'): Promise<string[]> {
    const model = await this.selectModel();

    const instructions =
      language === 'ja'
        ? `以下の内容を代表する、短く関連性の高いキーワードを5〜8個抽出してください。
各キーワードは1〜3単語までにしてください。
文章や説明ではなく、単語または短いフレーズのみにしてください。
JSON配列の文字列のみで回答してください。例: ["請求書", "山田太郎", "2024年1月"]
説明や前置きは一切含めないでください。`
        : `Extract 5-8 short, relevant keywords that best represent the content below.
Each keyword must be 1-3 words only, not a sentence or explanation.
Respond with ONLY a JSON array of strings, e.g. ["invoice", "John Smith", "January 2024"].
Do not include any preamble or explanation.`;

    const userPrompt = `${instructions}\n\nContent:\n${text}`;

    try {
      const content = await this.chatRequest(model, buildSystemPrompt(language), userPrompt, 0.3);
      return this.parseKeywords(content);
    } catch (error) {
      console.error('Ollama keyword extraction error:', error);
      return [];
    }
  }

  private parseKeywords(text: string): string[] {
    const clean = (values: unknown[]): string[] => [
      ...new Set(
        values.map(v => String(v).trim()).filter(k => k.length > 1 && k.length <= 40 && k.split(/\s+/).length <= 3),
      ),
    ];

    // Try to parse a JSON array, tolerating extra text around it
    const arrayMatch = text.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      try {
        const parsed = JSON.parse(arrayMatch[0]);
        if (Array.isArray(parsed)) {
          return clean(parsed);
        }
      } catch (e) {
        // fall through to line/comma parsing
      }
    }

    // Fall back to comma or newline separated list, stripping list markers/quotes
    const items = text
      .split(/[\n,]/)
      .map(l => l.replace(/^[\s\-*\d.)"']+|["'\s]+$/g, ''))
      .filter(Boolean);

    return clean(items);
  }

  private parseExtractedData(text: string): Record<string, any> {
    // Some models (e.g. Gemma) wrap JSON in a ```json code fence or add a preamble,
    // so try the fenced block, then the outermost {...}, then the raw text
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
    const braced = text.match(/\{[\s\S]*\}/)?.[0];
    for (const candidate of [fenced, braced, text]) {
      if (!candidate) continue;
      try {
        const parsed = JSON.parse(candidate.trim());
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return parsed;
        }
      } catch (e) {
        // try the next candidate
      }
    }

    // Not JSON: parse "key: value" lines, including markdown lists such as
    // "*   **Invoice Number:** 4821"
    const stripMarkdown = (s: string) =>
      s
        .replace(/^\s*(?:[-*+•]|\d+[.)])\s+/, '')
        .replace(/\*{1,3}|__|`+/g, '')
        .trim()
        .replace(/^["']|["'],?$/g, '')
        .trim();

    const result: Record<string, any> = {};
    text.split('\n').forEach(line => {
      // Full-width colon covers Japanese responses
      const match = stripMarkdown(line).match(/^([^:：]+)[:：]\s*(.+)$/);
      if (!match) return;
      const key = match[1]
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, '_')
        .replace(/^_+|_+$/g, '');
      const value = stripMarkdown(match[2]);
      if (key && value) {
        result[key] = value;
      }
    });

    // If no key:value pairs found, return the entire text as "content"
    return Object.keys(result).length > 0 ? result : { content: text.trim() };
  }
}
