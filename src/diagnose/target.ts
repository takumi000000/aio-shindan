import { z } from "zod";

/** 診断対象店舗の情報。CLI引数または JSON ファイルから読み込む。 */
export const TargetSchema = z.object({
  /** 店舗名（正式名称）。 */
  name: z.string().min(1),
  /** 店舗名の別表記（略称、ひらがな、英字など）。検出精度を上げるために使う。 */
  aliases: z.array(z.string()).default([]),
  /** エリア（例: 松江市）。 */
  area: z.string().min(1),
  /** 業種（例: メンズサロン）。 */
  industry: z.string().min(1),
  /** 公式サイトURL（任意）。サイテーション検出に使う。 */
  website: z.string().url().optional(),
  /** Googleビジネスプロフィールの説明文など、店舗の強みに関する補足（任意）。 */
  notes: z.string().optional(),
});

export type Target = z.infer<typeof TargetSchema>;
