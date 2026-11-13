import OpenAI from "openai";
import type { AiAnswer, AiProvider, ProviderName } from "./types.js";

/**
 * Perplexity への問い合わせ。OpenAI互換の Chat Completions エンドポイントを使う。
 * 引用は Perplexity 独自の `citations` フィールドで返る。
 */
export class PerplexityProvider implements AiProvider {
  readonly name: ProviderName = "Perplexity";
  private readonly client: OpenAI;

  constructor(
    apiKey: string,
    readonly model: string,
  ) {
    this.client = new OpenAI({ apiKey, baseURL: "https://api.perplexity.ai" });
  }

  async ask(query: string): Promise<AiAnswer> {
    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages: [{ role: "user", content: query }],
    });

    const raw = completion as unknown as { citations?: unknown };
    const citations = Array.isArray(raw.citations)
      ? raw.citations.filter((c): c is string => typeof c === "string")
      : [];

    return {
      provider: this.name,
      model: completion.model,
      query,
      text: completion.choices[0]?.message.content ?? "",
      citations,
    };
  }
}
