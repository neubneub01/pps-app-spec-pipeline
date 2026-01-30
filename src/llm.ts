/**
 * LLM API integration for calling Anthropic Claude API
 */

import Anthropic from "@anthropic-ai/sdk";
import yaml from "js-yaml";
import type { PPSEnvelope } from "./schemas/pps.js";
import type { PromptResult } from "./schemas/prompt-result.js";

export interface LLMConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface LLMCallOptions {
  envelope: PPSEnvelope;
  promptTemplate: string;
  config: LLMConfig;
}

/**
 * Call Claude API with a PPS envelope and prompt template
 */
export async function callLLM(
  options: LLMCallOptions
): Promise<PromptResult> {
  const { envelope, promptTemplate, config } = options;
  const {
    apiKey,
    model = "claude-3-5-sonnet-20241022",
    maxTokens = 8000,
    temperature = 0.7,
  } = config;

  const client = new Anthropic({ apiKey });

  // Serialize envelope to YAML
  const envelopeYaml = yaml.dump(envelope, { lineWidth: -1 });

  // Build full prompt
  const fullPrompt = promptTemplate.replace("{envelope}", envelopeYaml);

  // Call Claude API
  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    temperature,
    messages: [
      {
        role: "user",
        content: fullPrompt,
      },
    ],
  });

  // Extract text content
  const textContent = response.content.find((c) => c.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text content in Claude response");
  }

  const rawText = textContent.text;

  // Extract YAML from response (handle markdown code blocks)
  const yamlMatch =
    rawText.match(/```ya?ml\n([\s\S]*?)\n```/) ||
    rawText.match(/```\n([\s\S]*?)\n```/);

  const yamlText = yamlMatch ? yamlMatch[1] : rawText;

  // Parse YAML to PromptResult
  const result = yaml.load(yamlText) as PromptResult;

  return result;
}

/**
 * Validate that we have a working API key
 */
export async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    const client = new Anthropic({ apiKey });
    await client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 10,
      messages: [{ role: "user", content: "test" }],
    });
    return true;
  } catch (error) {
    return false;
  }
}
