import type { DiagnosisResult } from "../diagnose/run.js";
import { AXIS_LABELS } from "../diagnose/score.js";

function esc(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function stars(score: number): string {
  return "★".repeat(score) + "☆".repeat(5 - score);
}

/** 診断結果を、見込み客にそのまま渡せる1枚のHTMLレポートにする。 */
export function renderHtml(result: DiagnosisResult): string {
  const { target, scoreCard, mentions, mentionRate, answers, failures } = result;
  const date = new Date(result.generatedAt).toLocaleDateString("ja-JP");

  const rateRows = Object.entries(mentionRate)
    .map(
      ([provider, rate]) =>
        `<tr><td>${esc(provider)}</td><td>${Math.round(rate * 100)}%</td><td>${
          rate > 0 ? "推薦あり" : "推薦なし"
        }</td></tr>`,
    )
    .join("");

  const axisRows = (scoreCard?.axes ?? [])
    .map(
      (a) => `<tr>
        <th>${esc(AXIS_LABELS[a.axis])}</th>
        <td class="score">${stars(a.score)} ${a.score}/5</td>
        <td>${esc(a.evidence)}</td>
        <td>${esc(a.recommendation)}</td>
      </tr>`,
    )
    .join("");

  const competitorRows = (scoreCard?.competitors ?? [])
    .map(
      (c) =>
        `<tr><td>${esc(c.name)}</td><td>${c.mentionCount}回</td><td>${c.reasonsCited.map(esc).join("、")}</td></tr>`,
    )
    .join("");

  const actionItems = (scoreCard?.topActions ?? []).map((a) => `<li>${esc(a)}</li>`).join("");

  const answerBlocks = answers
    .map((a, i) => {
      const m = mentions[i];
      return `<details>
        <summary>${esc(a.provider)}（${esc(a.model)}） — ${esc(a.query)} — ${
          m.mentioned ? `<b class="ok">掲載あり</b>（${esc(m.matchedAlias ?? "")}）` : `<b class="ng">掲載なし</b>`
        }</summary>
        <pre>${esc(a.text)}</pre>
        ${a.citations.length ? `<p class="cite">引用: ${a.citations.map((u) => `<a href="${esc(u)}">${esc(u)}</a>`).join(" ")}</p>` : ""}
      </details>`;
    })
    .join("");

  const failureBlock = failures.length
    ? `<section><h2>取得できなかった回答</h2><ul>${failures
        .map((f) => `<li>${esc(f.provider)}: ${esc(f.error)}</li>`)
        .join("")}</ul></section>`
    : "";

  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>AIO診断レポート - ${esc(target.name)}</title>
<style>
  :root { --ink:#1f2933; --muted:#616e7c; --line:#d9e2ec; --accent:#0b6e4f; --warn:#b3261e; --bg:#fff; }
  body { font-family: "Hiragino Sans","Noto Sans JP",system-ui,sans-serif; color:var(--ink); background:var(--bg); margin:0; padding:24px 16px; line-height:1.6; }
  main { max-width: 960px; margin: 0 auto; }
  h1 { font-size: 1.6rem; margin-bottom: .2rem; }
  h2 { font-size: 1.15rem; border-left: 4px solid var(--accent); padding-left: .6rem; margin-top: 2rem; }
  .meta { color: var(--muted); font-size: .9rem; }
  table { border-collapse: collapse; width: 100%; margin-top: .5rem; font-size: .92rem; }
  th, td { border: 1px solid var(--line); padding: .5rem .6rem; text-align: left; vertical-align: top; }
  th { background: #f5f7fa; font-weight: 600; }
  .score { white-space: nowrap; color: var(--accent); font-weight: 700; }
  .ok { color: var(--accent); } .ng { color: var(--warn); }
  details { border: 1px solid var(--line); border-radius: 6px; padding: .4rem .8rem; margin: .5rem 0; }
  pre { white-space: pre-wrap; font: inherit; background: #f5f7fa; padding: .6rem; border-radius: 4px; }
  .cite { font-size: .8rem; word-break: break-all; }
  .summary { background: #eef6f2; border-radius: 8px; padding: 1rem; }
  @media print { details { break-inside: avoid; } }
</style>
</head>
<body>
<main>
  <h1>AIO診断レポート：${esc(target.name)}</h1>
  <p class="meta">${esc(target.area)} / ${esc(target.industry)} ・ 診断日 ${date}</p>

  ${scoreCard ? `<section class="summary"><h2 style="margin-top:0">総評</h2><p>${esc(scoreCard.summary)}</p></section>` : ""}

  <section>
    <h2>AI別の推薦状況</h2>
    <p>「${esc(target.area)}でおすすめの${esc(target.industry)}」などの質問に対して、御社名が回答に含まれた割合です。</p>
    <table><thead><tr><th>AI</th><th>推薦率</th><th>判定</th></tr></thead><tbody>${rateRows}</tbody></table>
  </section>

  ${
    scoreCard
      ? `<section>
    <h2>5つの評価軸スコア</h2>
    <table><thead><tr><th>評価軸</th><th>スコア</th><th>根拠</th><th>改善提案</th></tr></thead><tbody>${axisRows}</tbody></table>
  </section>
  <section>
    <h2>AIが推薦している競合</h2>
    <table><thead><tr><th>店舗</th><th>登場回数</th><th>推薦理由として挙げられた点</th></tr></thead><tbody>${competitorRows}</tbody></table>
  </section>
  <section>
    <h2>次の一手（優先順）</h2>
    <ol>${actionItems}</ol>
  </section>`
      : ""
  }

  <section>
    <h2>AIの回答全文（根拠資料）</h2>
    ${answerBlocks}
  </section>
  ${failureBlock}
</main>
</body>
</html>`;
}
