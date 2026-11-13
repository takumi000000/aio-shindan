import type { Env } from "../config.js";
import { ClaudeProvider } from "./anthropic.js";
import { ChatGptProvider } from "./openai.js";
import { GeminiProvider } from "./gemini.js";
import { PerplexityProvider } from "./perplexity.js";
import type { AiProvider } from "./types.js";

/** APIキーが設定されているプロバイダだけを組み立てる。 */
export function buildProviders(env: Env): AiProvider[] {
  const providers: AiProvider[] = [];
  if (env.OPENAI_API_KEY) providers.push(new ChatGptProvider(env.OPENAI_API_KEY, env.AIO_OPENAI_MODEL));
  if (env.GEMINI_API_KEY) providers.push(new GeminiProvider(env.GEMINI_API_KEY, env.AIO_GEMINI_MODEL));
  if (env.PERPLEXITY_API_KEY)
    providers.push(new PerplexityProvider(env.PERPLEXITY_API_KEY, env.AIO_PERPLEXITY_MODEL));
  if (env.ANTHROPIC_API_KEY) providers.push(new ClaudeProvider(env.ANTHROPIC_API_KEY, env.AIO_ANTHROPIC_MODEL));
  return providers;
}

export type { AiAnswer, AiProvider, ProviderName } from "./types.js";
