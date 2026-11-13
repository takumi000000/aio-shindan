import Anthropic from "@anthropic-ai/sdk";
import type { AiAnswer, AiProvider } from "./types.js";

/**
 * Claude（Anthropic）への問い合わせ。
 * Web検索ツールを有効にして、実際のユーザーが「おすすめを教えて」と聞いたときと
 * 同じ条件で回答を取得する。
 */
export class ClaudeProvider implements AiProvider {
  readonly name = "Claude" as const;
  private readonly client: Anthropic;

  constructor(
    apiKey: string,
    readonly model: string,
  ) {
    this.client = new Anthropic({ apiKey });
  }

  async ask(query: string): Promise<AiAnswer> {
    const stream = this.client.beta.messages.stream({
      model: this.model,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      thinking: { type: "adaptive" },
      output_config: { effort: "medium" },
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 5 }],
      messages: [{ role: "user", content: query }],
    });
    const response = await stream.finalMessage();

    if (response.stop_reason === "refusal") {
      const explanation = response.stop_details?.explanation ?? "理由不明";
      throw new Error(`Claude が回答を拒否しました: ${explanation}`);
    }

    const texts: string[] = [];
    const citations = new Set<string>();
    for (const block of response.content) {
      if (block.type === "text") {
        texts.push(block.text);
        for (const c of block.citations ?? []) {
          if (c.type === "web_search_result_location") citations.add(c.url);
        }
      } else if (block.type === "web_search_tool_result" && Array.isArray(block.content)) {
        for (const r of block.content) {
          if (r.type === "web_search_result") citations.add(r.url);
        }
      }
    }

    return {
      provider: this.name,
      model: response.model,
      query,
      text: texts.join("\n"),
      citations: [...citations],
    };
  }
}
