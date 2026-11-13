import type { Target } from "./target.js";

/**
 * 実際のユーザーがAIに聞く形の質問を複数パターン生成する。
 * 1パターンだけだと偶然に左右されるため、言い回しを変えて定点観測する。
 */
export function buildQueries(target: Target): string[] {
  const { area, industry } = target;
  return [
    `${area}でおすすめの${industry}を教えて`,
    `${area}で評判のいい${industry}はどこですか？理由も教えてください`,
    `${area}の${industry}を3〜5軒、特徴つきで比較して紹介してください`,
  ];
}
