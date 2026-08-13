import Anthropic from "@anthropic-ai/sdk";
import { env } from "../env.js";

let client: Anthropic | null = null;

/** ANTHROPIC_API_KEY topilmasa `null` qaytaradi — chaqiruvchi tomon stub oqimga o'tishi kerak. */
export function getAnthropicClient(): Anthropic | null {
  if (!env.anthropicApiKey) {
    return null;
  }
  if (!client) {
    client = new Anthropic({ apiKey: env.anthropicApiKey });
  }
  return client;
}

export function isAnthropicConfigured(): boolean {
  return Boolean(env.anthropicApiKey);
}
