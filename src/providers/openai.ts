import OpenAI from "openai";
import type { AiAnswer, AiProvider, ProviderName } from "./types.js";

/**
 * ChatGPT（OpenAI）への問い合わせ。Responses API + web_search ツールを使う。
 */
export class ChatGptProvider implements AiProvider {
  readonly name: ProviderName = "ChatGPT";
  private readonly client: OpenAI;

  constructor(
    apiKey: string,
    readonly model: string,
  ) {
    this.client = new OpenAI({ apiKey });
  }

  async ask(query: string): Promise<AiAnswer> {
    const response = await this.client.responses.create({
      model: this.model,
      input: query,
      tools: [{ type: "web_search" }],
    });

    const citations = new Set<string>();
    for (const item of response.output) {
      if (item.type !== "message") continue;
      for (const part of item.content) {
        if (part.type !== "output_text") continue;
        for (const a of part.annotations ?? []) {
          if (a.type === "url_citation") citations.add(a.url);
        }
      }
    }

    return {
      provider: this.name,
      model: response.model,
      query,
      text: response.output_text,
      citations: [...citations],
    };
  }
}
