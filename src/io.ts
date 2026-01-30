/**
 * YAML I/O for PPS v1.2 envelope and PromptResult v1.2
 * State persistence (JSON) for pipeline state.
 */

import * as fs from "node:fs";
import yaml from "js-yaml";
import type { PPSEnvelope } from "./schemas/pps.js";
import type { PromptResult } from "./schemas/prompt-result.js";
import { validatePPSEnvelope, validatePromptResult } from "./validate.js";
import type { PipelineState } from "./orchestrator/types.js";

export function loadYAML<T = unknown>(path: string): T {
  const raw = fs.readFileSync(path, "utf-8");
  return yaml.load(raw) as T;
}

export function loadEnvelope(path: string): {
  envelope: PPSEnvelope;
  validation: { ok: boolean; errors: string[] };
} {
  const data = loadYAML<Record<string, unknown>>(path);
  const envelope = data as unknown as PPSEnvelope;
  const validation = validatePPSEnvelope(envelope);
  return { envelope, validation };
}

export function loadPromptResult(path: string): {
  result: PromptResult;
  validation: { ok: boolean; errors: string[] };
} {
  const data = loadYAML<{ prompt_result?: PromptResult }>(path);
  const result = data.prompt_result ?? (data as unknown as PromptResult);
  const validation = validatePromptResult(result);
  return { result, validation };
}

export function saveYAML(path: string, data: unknown): void {
  const out = yaml.dump(data, { lineWidth: 120, noRefs: true });
  fs.writeFileSync(path, out, "utf-8");
}

export function loadState(path: string): PipelineState {
  const raw = fs.readFileSync(path, "utf-8");
  return JSON.parse(raw) as PipelineState;
}

export function saveState(path: string, state: PipelineState): void {
  fs.writeFileSync(path, JSON.stringify(state, null, 2), "utf-8");
}
