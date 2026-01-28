/**
 * Validation helpers for PPS v1.2 and PromptResult v1.2
 * R0–R4 normative rules
 */

import { PPS_VERSION, OUTPUT_FORMAT } from "./schemas/pps.js";
import type { PPSEnvelope } from "./schemas/pps.js";
import type { PromptResult } from "./schemas/prompt-result.js";
import { GATE_IDS } from "./gates.js";

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

export function validatePPSEnvelope(envelope: unknown): ValidationResult {
  const errors: string[] = [];
  const e = envelope as Record<string, unknown>;

  if (!e || typeof e !== "object") {
    return { ok: false, errors: ["Envelope must be an object"] };
  }
  if (e.pps_version !== PPS_VERSION) {
    errors.push(`pps_version must be "${PPS_VERSION}"`);
  }
  const meta = e.meta as Record<string, unknown> | undefined;
  if (!meta || typeof meta !== "object") {
    errors.push("meta required");
  } else {
    if (!meta.run_id || typeof meta.run_id !== "string") {
      errors.push("meta.run_id required and must be unique per execution");
    }
    if (meta.output_format !== OUTPUT_FORMAT) {
      errors.push(`meta.output_format must be "${OUTPUT_FORMAT}"`);
    }
  }
  const th = meta?.token_hygiene as Record<string, unknown> | undefined;
  if (th && th.context_block_policy !== "summary_only") {
    errors.push("token_hygiene.context_block_policy must be 'summary_only'");
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}

export function validatePromptResult(result: unknown): ValidationResult {
  const errors: string[] = [];
  const r = result as Record<string, unknown>;

  if (!r || typeof r !== "object") {
    return { ok: false, errors: ["Result must be an object"] };
  }
  const meta = r.meta as Record<string, unknown> | undefined;
  if (!meta || typeof meta !== "object") {
    errors.push("prompt_result.meta required");
  } else {
    if (!meta.prompt_id) errors.push("prompt_result.meta.prompt_id required");
    if (!meta.run_id) errors.push("prompt_result.meta.run_id required");
  }
  const gr = r.gate_result as Record<string, unknown> | undefined;
  if (!gr || typeof gr !== "object") {
    errors.push("prompt_result.gate_result required");
  } else {
    const status = gr.status as string;
    if (status && !["pass", "fail", "na"].includes(status)) {
      errors.push("gate_result.status must be pass | fail | na");
    }
  }
  const au = r.appendices_updates as Record<string, unknown> | undefined;
  if (!au || typeof au !== "object") {
    errors.push("prompt_result.appendices_updates required");
  }
  const su = r.state_updates as Record<string, unknown> | undefined;
  if (!su || typeof su !== "object") {
    errors.push("prompt_result.state_updates required");
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}

export function validateGateTarget(gateTarget: string): ValidationResult {
  const errors: string[] = [];
  if (gateTarget !== "N/A" && !(GATE_IDS as readonly string[]).includes(gateTarget)) {
    errors.push(`Unknown gate_target: ${gateTarget}`);
  }
  return { ok: errors.length === 0, errors };
}
