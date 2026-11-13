import type { AiAnswer, AiProvider } from "../providers/types.js";
import { detectMention, mentionRateByProvider, type MentionResult } from "./detect.js";
import { buildQueries } from "./queries.js";
import type { ScoreCard } from "./score.js";
import type { Target } from "./target.js";

export interface DiagnosisResult {
  target: Target;
  generatedAt: string;
  answers: AiAnswer[];
  mentions: MentionResult[];
  mentionRate: Record<string, number>;
  /** 問い合わせに失敗したプロバイダとエラー内容。 */
  failures: { provider: string; query: string; error: string }[];
  scoreCard?: ScoreCard;
}

export interface RunOptions {
  target: Target;
  providers: AiProvider[];
  scorer?: { score(target: Target, answers: AiAnswer[], mentions: MentionResult[]): Promise<ScoreCard> };
  log?: (message: string) => void;
}

/** 全プロバイダ × 全クエリを並列で問い合わせ、検出とスコアリングを行う。 */
export async function runDiagnosis(opts: RunOptions): Promise<DiagnosisResult> {
  const log = opts.log ?? (() => {});
  const queries = buildQueries(opts.target);
  const failures: DiagnosisResult["failures"] = [];

  const settled = await Promise.allSettled(
    opts.providers.flatMap((p) =>
      queries.map(async (q) => {
        log(`[${p.name}] ${q}`);
        return p.ask(q);
      }),
    ),
  );

  const answers: AiAnswer[] = [];
  settled.forEach((s, i) => {
    const provider = opts.providers[Math.floor(i / queries.length)];
    const query = queries[i % queries.length];
    if (s.status === "fulfilled") {
      answers.push(s.value);
    } else {
      const error = s.reason instanceof Error ? s.reason.message : String(s.reason);
      log(`[${provider.name}] 失敗: ${error}`);
      failures.push({ provider: provider.name, query, error });
    }
  });

  const mentions = answers.map((a) => detectMention(a, opts.target));
  const result: DiagnosisResult = {
    target: opts.target,
    generatedAt: new Date().toISOString(),
    answers,
    mentions,
    mentionRate: mentionRateByProvider(mentions),
    failures,
  };

  if (opts.scorer && answers.length > 0) {
    log("スコアリング中...");
    result.scoreCard = await opts.scorer.score(opts.target, answers, mentions);
  }
  return result;
}
