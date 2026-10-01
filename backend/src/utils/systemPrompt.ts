/**
 * Language-aware system prompts for AI responses
 * Instructs the AI model to respond in the selected language
 */

import type { Prompt } from '../types/index.js';

export type Language = 'en' | 'ja';

/**
 * Build a system prompt for the selected language
 * This will be prepended to user prompts to instruct the AI to respond in that language
 */
export function buildSystemPrompt(language: Language = 'en'): string {
  const prompts: Record<Language, string> = {
    en: `You are a helpful AI assistant that analyzes documents and extracts information.
Respond clearly and concisely in English.
Format your responses in a structured and organized manner.
When extracting data, provide it in a clear, machine-readable format when possible.`,

    ja: `あなたは、ドキュメントを分析し、情報を抽出するのに役立つAIアシスタントです。
重要：**すべての応答は日本語で、自然で流暢な日本語で提供してください。英語は使用しないでください。**
日本語で明確かつ簡潔に対応してください。
回答は構造化された組織化された形式でフォーマットしてください。
データを抽出する際は、可能な限り明確で機械可読な形式で提供してください。`,
  };

  return prompts[language] || prompts.en;
}

/**
 * Build a data extraction prompt that respects the selected language
 * Used when extracting data from documents
 */
export function buildExtractionPrompt(userPrompt: string, language: Language = 'en'): string {
  const systemPrompt = buildSystemPrompt(language);

  if (language === 'ja') {
    return `${systemPrompt}

ユーザーリクエスト: ${userPrompt}

指示：
- 必ず日本語で回答してください
- 英語の単語は使用しないでください
- 自然で流暢な日本語で提供してください
- 抽出された情報は構造化された形式で提供してください
- 可能であればJSON形式で回答してください`;
  }

  return `${systemPrompt}

User Request: ${userPrompt}

Provide the extracted information in a structured format. If possible, use JSON format for the response.`;
}

/**
 * Build a chat/query prompt that respects the selected language
 * Used when answering questions about documents
 */
export function buildChatPrompt(query: string, language: Language = 'en'): string {
  const systemPrompt = buildSystemPrompt(language);

  if (language === 'ja') {
    return `${systemPrompt}

以下の質問に日本語で回答してください。必ず日本語のみを使用してください：
${query}`;
  }

  return `${systemPrompt}

Answer the following question in English:
${query}`;
}

/**
 * Get language display name
 */
export function getLanguageName(language: Language): string {
  const names: Record<Language, string> = {
    en: 'English',
    ja: '日本語 (Japanese)',
  };
  return names[language] || 'English';
}

/**
 * Validate language parameter
 */
export function isValidLanguage(lang: unknown): lang is Language {
  return lang === 'en' || lang === 'ja';
}

/**
 * Get language from request body with validation
 */
export function getLanguageFromRequest(
  body: { language?: unknown } | undefined,
  defaultLanguage: Language = 'en',
): Language {
  const language = body?.language;

  return isValidLanguage(language) ? language : defaultLanguage;
}

/**
 * Translate a prompt to the requested language
 * Used for translating template prompts
 */
export function translatePrompt(prompt: Prompt, language: Language = 'en'): Prompt {
  if (language === 'en') {
    return prompt;
  }

  // If translations exist for the language, use them
  if (prompt.translations && prompt.translations[language]) {
    const translation = prompt.translations[language];
    return {
      ...prompt,
      name: translation.name,
      prompt: translation.prompt,
    };
  }

  // Otherwise return the original (English) prompt
  return prompt;
}

/**
 * Translate an array of prompts to the requested language
 */
export function translatePrompts(prompts: Prompt[], language: Language = 'en'): Prompt[] {
  return prompts.map(prompt => translatePrompt(prompt, language));
}
