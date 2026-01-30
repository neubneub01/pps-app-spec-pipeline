/**
 * Stub PromptResult v1.2 for each prompt (APP/01–08).
 * Use for demos and tests without LLM calls.
 */

import { createEmptyPromptResult } from "./schemas/prompt-result.js";
import type { PromptResult } from "./schemas/prompt-result.js";
import { GATE_IDS, GATE_OWNERSHIP } from "./gates.js";
import type { GateId } from "./gates.js";

const PROMPT_TO_GATE: Record<string, GateId | "N/A"> = {
  "APP/01_mvp-cutter": "GATE_1_MVP_BOUNDED",
  "APP/02_ux-flows": "GATE_2_TRACEABILITY_FLOW_SCREEN_STATE",
  "APP/03_architecture": "GATE_3_TRUST_AND_CLASSIFICATION",
  "APP/04_data-api-contract": "GATE_4_CONTRACT_FREEZE_V0",
  "APP/05_frontend-plan": "GATE_5_CONTRACT_NO_DEVIATIONS",
  "APP/06_backend-plan": "N/A",
  "APP/07_integrations-async-security": "GATE_6_INTEGRATIONS_HARDENED",
  "APP/08_release-ops": "GATE_7_STAGING_REHEARSAL_AND_SLO_ALERTS",
};

export type StubOptions = {
  prompt_id: string;
  run_id: string;
  gate_target?: string;
  status?: "pass" | "fail" | "na";
  iteration_id?: string;
  applied_to_freeze_label?: string;
};

/**
 * Build a minimal valid PromptResult for the given prompt.
 * Default gate/status from prompt; override via options.
 */
export function stubResult(options: StubOptions): PromptResult {
  const {
    prompt_id,
    run_id,
    gate_target,
    status,
    iteration_id = new Date().toISOString().slice(0, 25),
    applied_to_freeze_label = "",
  } = options;

  const gate = gate_target ?? (PROMPT_TO_GATE[prompt_id] ?? "N/A");
  const st = status ?? (gate === "N/A" ? "na" : "pass");
  const gateId = gate === "N/A" ? "" : gate;

  const r = createEmptyPromptResult({
    prompt_id,
    run_id,
    iteration_id,
    applied_to_freeze_label,
  });

  r.gate_result = {
    gate_id: gateId,
    status: st,
    reason: st === "na" ? "" : `stub ${st}`,
    blockers: [],
    next_actions: gate === "N/A" ? [] : [`Run next prompt in sequence`],
  };

  return r;
}

export { GATE_IDS, GATE_OWNERSHIP, PROMPT_TO_GATE };
