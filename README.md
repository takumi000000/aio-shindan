# aio-shindan — AIO診断レポート作成システム

地域ビジネス向けの **AIO（AI最適化 / LLMO）診断レポート** を自動生成するCLIです。
「〇〇市でおすすめの〇〇を教えて」という質問を主要なAI（ChatGPT / Gemini / Perplexity / Claude）に投げ、

1. 対象店舗が回答に登場するか（AI別の推薦率）
2. 5つの評価軸でのスコア（エンティティ認識・特徴の言語化・口コミ文脈・情報構造化・サイテーション）
3. AIが推薦している競合と、その推薦理由
4. 優先順位つきの「次の一手」

を1枚のHTMLレポート（＋生データJSON）にまとめます。商談のフロント商品（診断レポート）や、月次の定点観測にそのまま使えます。

## セットアップ

```bash
npm ci
cp .env.example .env   # 使うAIのAPIキーを設定
```

APIキーが設定されたプロバイダだけが診断に使われます。スコアリング（5軸採点）には `ANTHROPIC_API_KEY` が必要です。

## 使い方

```bash
# 店舗情報JSONの雛形を作る
npm run dev -- init-target target.json

# 診断を実行（reports/ にHTMLとJSONを出力）
npm run dev -- run -f target.json

# コマンドライン引数だけで実行
npm run dev -- run -n "店舗名" -a "松江市" -i "メンズサロン" --alias "略称" --website https://example.com
```

`--no-score` を付けると採点をスキップし、AI回答の収集と推薦率の集計だけを行います。

## 構成

```
src/
  cli.ts              CLI エントリポイント
  config.ts           環境変数（zodで検証）
  providers/          各AIへの問い合わせアダプタ（ChatGPT / Gemini / Perplexity / Claude）
  diagnose/
    target.ts         診断対象店舗のスキーマ
    queries.ts        ユーザーが実際に聞く形の質問パターン
    detect.ts         回答中の店舗名検出・推薦率の集計
    score.ts          Claude による5軸スコアリング（構造化出力）
    run.ts            全体の実行フロー
  report/render.ts    HTMLレポートの生成
tests/                vitest
```

## 開発

```bash
npm run typecheck
npm test
npm run build
```
