import { GoogleGenAI } from "@google/genai";
import type { AiAnswer, AiProvider, ProviderName } from "./types.js";

/**
 * Gemini（Google）への問い合わせ。Google検索グラウンディングを有効にする。
 */
export class GeminiProvider implements AiProvider {
  readonly name: ProviderName = "Gemini";
  private readonly client: GoogleGenAI;

  constructor(
    apiKey: string,
    readonly model: string,
  ) {
    this.client = new GoogleGenAI({ apiKey });
  }

  async ask(query: string): Promise<AiAnswer> {
    const response = await this.client.models.generateContent({
      model: this.model,
      contents: query,
      config: { tools: [{ googleSearch: {} }] },
    });

    const citations = new Set<string>();
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
    for (const chunk of chunks) {
      const uri = chunk.web?.uri;
      if (uri) citations.add(uri);
    }

    return {
      provider: this.name,
      model: this.model,
      query,
      text: response.text ?? "",
      citations: [...citations],
    };
  }
}
