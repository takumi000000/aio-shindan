import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { AiAnswer } from "../providers/types.js";
import type { MentionResult } from "./detect.js";
import type { Target } from "./target.js";

/** AIO診断の5つの評価軸。 */
export const AXES = [
  "entity_recognition",
  "feature_verbalization",
  "review_context",
  "structured_data",
  "citation",
] as const;
export type Axis = (typeof AXES)[number];

export const AXIS_LABELS: Record<Axis, string> = {
  entity_recognition: "エンティティ認識（AIが店舗を同一の実体として認識しているか）",
  feature_verbalization: "特徴の言語化（強み・得意メニューがAIの推薦文に使える形になっているか）",
  review_context: "口コミ文脈（具体的なメニューや悩み解決を含む口コミがあるか）",
  structured_data: "情報構造化（NAP統一・構造化データ・FAQなど機械可読性）",
  citation: "サイテーション（外部メディア・SNS・ポータルでの言及）",
};

const AxisScoreSchema = z.object({
  axis: z.enum(AXES),
  /** 0〜5点。 */
  score: z.number().int().min(0).max(5),
  /** 根拠（AI回答のどこからそう判断したか）。 */
  evidence: z.string(),
  /** 改善提案（店舗オーナーがそのまま着手できる粒度）。 */
  recommendation: z.string(),
});

export const ScoreCardSchema = z.object({
  summary: z.string().describe("経営者向けの総評を3〜4文で"),
  competitors: z
    .array(
      z.object({
        name: z.string(),
        mentionCount: z.number().int().min(0),
        reasonsCited: z.array(z.string()),
      }),
    )
    .describe("AI回答に登場した競合店舗と、推薦理由として挙げられていたポイント"),
  axes: z.array(AxisScoreSchema).length(AXES.length),
  topActions: z.array(z.string()).min(3).max(5).describe("優先順位順の次の一手"),
});

export type ScoreCard = z.infer<typeof ScoreCardSchema>;

const SYSTEM_PROMPT = `あなたは地域ビジネス向けのAIO（AI最適化 / LLMO）コンサルタントです。
複数のAI検索エンジンに「エリア×業種のおすすめ」を質問した結果と、診断対象店舗の情報を受け取り、
5つの評価軸でスコアリングした診断カードを作成します。

評価の原則:
- 根拠はAI回答の引用で示す。推測で加点しない。
- 対象店舗が一度も登場しない場合、entity_recognition は 0〜1 点。
- 競合が推薦された理由（例: 「個室」「メンズ専門」「駅近」）は、対象店舗が言語化すべき特徴のヒントとして扱う。
- 改善提案は店舗オーナーが今週着手できる具体的な行動にする（例: 「Googleビジネスプロフィールの説明文に〇〇を追記」）。
- 日本語で、専門用語には短い補足を添える。`;

export class Scorer {
  private readonly client: Anthropic;

  constructor(
    apiKey: string,
    private readonly model: string,
  ) {
    this.client = new Anthropic({ apiKey });
  }

  async score(target: Target, answers: AiAnswer[], mentions: MentionResult[]): Promise<ScoreCard> {
    const payload = {
      target,
      mentionSummary: mentions,
      answers: answers.map((a) => ({
        provider: a.provider,
        model: a.model,
        query: a.query,
        text: a.text,
        citations: a.citations,
      })),
    };

    const response = await this.client.messages.parse({
      model: this.model,
      max_tokens: 16000,
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      thinking: { type: "adaptive" },
      output_config: {
        effort: "high",
        format: zodOutputFormat(ScoreCardSchema),
      },
      messages: [
        {
          role: "user",
          content: `以下のJSONをもとに診断カードを作成してください。\n\n${JSON.stringify(payload, null, 2)}`,
        },
      ],
    });

    if (response.stop_reason === "refusal") {
      throw new Error(`スコアリングが拒否されました: ${response.stop_details?.explanation ?? "理由不明"}`);
    }
    if (!response.parsed_output) {
      throw new Error("スコアリング結果のパースに失敗しました");
    }
    return response.parsed_output;
  }
}
