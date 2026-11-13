import "dotenv/config";
import { z } from "zod";

const EnvSchema = z.object({
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  PERPLEXITY_API_KEY: z.string().optional(),
  AIO_ANTHROPIC_MODEL: z.string().default("claude-opus-5-5"),
  AIO_OPENAI_MODEL: z.string().default("gpt-5"),
  AIO_GEMINI_MODEL: z.string().default("gemini-2.5-flash"),
  AIO_PERPLEXITY_MODEL: z.string().default("sonar"),
  AIO_REPORT_DIR: z.string().default("./reports"),
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = EnvSchema.safeParse(source);
  if (!parsed.success) {
    throw new Error(`環境変数の読み込みに失敗しました: ${parsed.error.message}`);
  }
  return parsed.data;
}
