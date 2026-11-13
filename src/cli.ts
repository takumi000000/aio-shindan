#!/usr/bin/env node
import { Command } from "commander";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadEnv } from "./config.js";
import { runDiagnosis } from "./diagnose/run.js";
import { Scorer } from "./diagnose/score.js";
import { TargetSchema, type Target } from "./diagnose/target.js";
import { buildProviders } from "./providers/index.js";
import { renderHtml } from "./report/render.js";

const program = new Command();
program.name("aio-shindan").description("AIO（AI最適化）診断レポート作成システム");

program
  .command("run")
  .description("主要AIに問い合わせて診断レポート（HTML + JSON）を生成する")
  .option("-f, --file <path>", "店舗情報のJSONファイル（TargetSchema 形式）")
  .option("-n, --name <name>", "店舗名")
  .option("-a, --area <area>", "エリア（例: 松江市）")
  .option("-i, --industry <industry>", "業種（例: メンズサロン）")
  .option("--alias <alias...>", "店舗名の別表記")
  .option("--website <url>", "公式サイトURL")
  .option("--no-score", "スコアリング（Claudeによる採点）をスキップする")
  .option("-o, --out <dir>", "出力先ディレクトリ")
  .action(async (opts) => {
    const env = loadEnv();
    const target = await resolveTarget(opts);
    const providers = buildProviders(env);
    if (providers.length === 0) {
      throw new Error(
        "APIキーが1つも設定されていません。.env.example を参考に ANTHROPIC_API_KEY / OPENAI_API_KEY / GEMINI_API_KEY / PERPLEXITY_API_KEY のいずれかを設定してください。",
      );
    }

    const scorer =
      opts.score !== false && env.ANTHROPIC_API_KEY
        ? new Scorer(env.ANTHROPIC_API_KEY, env.AIO_ANTHROPIC_MODEL)
        : undefined;
    if (opts.score !== false && !scorer) {
      console.warn("ANTHROPIC_API_KEY が未設定のため、スコアリングをスキップします。");
    }

    console.log(`診断対象: ${target.name}（${target.area} / ${target.industry}）`);
    console.log(`使用AI: ${providers.map((p) => `${p.name}:${p.model}`).join(", ")}`);

    const result = await runDiagnosis({ target, providers, scorer, log: (m) => console.log(m) });

    const outDir = opts.out ?? env.AIO_REPORT_DIR;
    await mkdir(outDir, { recursive: true });
    const stamp = result.generatedAt.replace(/[:.]/g, "-");
    const base = path.join(outDir, `${slug(target.name)}-${stamp}`);
    await writeFile(`${base}.json`, JSON.stringify(result, null, 2), "utf8");
    await writeFile(`${base}.html`, renderHtml(result), "utf8");

    console.log("\n=== 推薦率 ===");
    for (const [provider, rate] of Object.entries(result.mentionRate)) {
      console.log(`${provider.padEnd(11)} ${Math.round(rate * 100)}%`);
    }
    console.log(`\nレポート: ${base}.html`);
  });

program
  .command("init-target")
  .description("店舗情報JSONの雛形を出力する")
  .argument("<path>", "出力先ファイル")
  .action(async (file: string) => {
    const sample: Target = {
      name: "サンプルメンズサロン",
      aliases: ["サンプル"],
      area: "松江市",
      industry: "メンズサロン",
      website: "https://example.com",
      notes: "メンズ専門・完全個室・駅から徒歩3分",
    };
    await writeFile(file, JSON.stringify(sample, null, 2), "utf8");
    console.log(`雛形を書き出しました: ${file}`);
  });

async function resolveTarget(opts: {
  file?: string;
  name?: string;
  area?: string;
  industry?: string;
  alias?: string[];
  website?: string;
}): Promise<Target> {
  if (opts.file) {
    const raw = JSON.parse(await readFile(opts.file, "utf8"));
    return TargetSchema.parse(raw);
  }
  return TargetSchema.parse({
    name: opts.name,
    area: opts.area,
    industry: opts.industry,
    aliases: opts.alias ?? [],
    website: opts.website,
  });
}

function slug(s: string): string {
  return s.normalize("NFKC").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "report";
}

program.parseAsync(process.argv).catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
