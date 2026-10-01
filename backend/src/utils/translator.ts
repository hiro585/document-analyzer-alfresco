import axios from 'axios';
import { OLLAMA_API_URL } from '../config/env.js';

/**
 * Detect if text is in Japanese
 */
export function isJapanese(text: string): boolean {
  // Check for Japanese characters (Hiragana, Katakana, Kanji)
  const japaneseRegex = /[぀-ゟ゠-ヿ一-鿿]/g;
  const japaneseChars = text.match(japaneseRegex);

  // If more than 20% of text is Japanese characters, consider it Japanese
  if (japaneseChars && japaneseChars.length > text.length * 0.2) {
    return true;
  }
  return false;
}

/**
 * Translate text using Mistral model
 */
export async function translateText(text: string, fromLanguage: string, toLanguage: string): Promise<string> {
  try {
    console.log(`📝 Translating from ${fromLanguage} to ${toLanguage}...`);

    const prompt = `Translate the following ${fromLanguage.toUpperCase()} text to ${toLanguage.toUpperCase()}.
Only output the translated text, nothing else.

${fromLanguage.toUpperCase()} text:
${text}

${toLanguage.toUpperCase()} translation:`;

    const response = await axios.post(`${OLLAMA_API_URL}/generate`, {
      model: 'mistral',
      prompt: prompt,
      stream: false,
    });

    const translation = response.data.response.trim();
    console.log(`✓ Translation complete`);
    return translation;
  } catch (error) {
    console.error('Translation error:', error);
    throw new Error('Failed to translate text');
  }
}

/**
 * Translate Japanese prompt to English for LLaVA
 */
export async function translateJapaneseToEnglish(japaneseText: string): Promise<string> {
  return translateText(japaneseText, 'Japanese', 'English');
}

/**
 * Translate English results to Japanese
 */
export async function translateEnglishToJapanese(englishText: string): Promise<string> {
  return translateText(englishText, 'English', 'Japanese');
}
