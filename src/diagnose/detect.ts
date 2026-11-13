import type { AiAnswer } from "../providers/types.js";
import type { Target } from "./target.js";

export interface MentionResult {
  provider: AiAnswer["provider"];
  query: string;
  /** 回答本文に店舗名（または別表記）が含まれていたか。 */
  mentioned: boolean;
  /** 一致した表記。 */
  matchedAlias?: string;
  /** 引用URLに公式サイトのドメインが含まれていたか。 */
  citedOfficialSite: boolean;
}

/** 全角・半角、空白、大文字小文字の揺れを吸収して比較する。 */
export function normalize(s: string): string {
  return s
    .normalize("NFKC")
    .replace(/\s+/g, "")
    .replace(/[・･]/g, "")
    .toLowerCase();
}

export function detectMention(answer: AiAnswer, target: Target): MentionResult {
  const body = normalize(answer.text);
  const candidates = [target.name, ...target.aliases].filter((a) => a.trim().length > 0);
  const matchedAlias = candidates.find((alias) => body.includes(normalize(alias)));

  let citedOfficialSite = false;
  if (target.website) {
    const host = safeHost(target.website);
    citedOfficialSite = host !== null && answer.citations.some((u) => safeHost(u) === host);
  }

  return {
    provider: answer.provider,
    query: answer.query,
    mentioned: matchedAlias !== undefined,
    matchedAlias,
    citedOfficialSite,
  };
}

function safeHost(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** プロバイダごとの推薦率（0〜1）。 */
export function mentionRateByProvider(results: MentionResult[]): Record<string, number> {
  const groups = new Map<string, { hit: number; total: number }>();
  for (const r of results) {
    const g = groups.get(r.provider) ?? { hit: 0, total: 0 };
    g.total += 1;
    if (r.mentioned) g.hit += 1;
    groups.set(r.provider, g);
  }
  const out: Record<string, number> = {};
  for (const [provider, g] of groups) out[provider] = g.total === 0 ? 0 : g.hit / g.total;
  return out;
}
