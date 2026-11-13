/** 診断対象となる各AI検索エンジンの共通インターフェース。 */
export interface AiAnswer {
  /** プロバイダ名（レポート表示用）。 */
  provider: ProviderName;
  /** 使用したモデルID。 */
  model: string;
  /** 投げた質問。 */
  query: string;
  /** AIの回答本文。 */
  text: string;
  /** 回答に付随する引用URL（取得できた場合）。 */
  citations: string[];
}

export type ProviderName = "ChatGPT" | "Gemini" | "Perplexity" | "Claude";

export interface AiProvider {
  readonly name: ProviderName;
  readonly model: string;
  ask(query: string): Promise<AiAnswer>;
}
