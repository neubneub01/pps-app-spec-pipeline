/**
 * PPS v1.2 — Standard Input Envelope
 * See pps_v_1.md §2
 */

import type {
  AppendixRef,
  ChangeLogEntry,
  ChangeRequest,
  DecisionLogEntry,
  OpenQuestionEntry,
} from "./shared.js";

export const PPS_VERSION = "1.2" as const;
export const OUTPUT_FORMAT = "prompt_result_v1.2" as const;

export type DepthMode = "MVP" | "Full" | "Blueprint";
export type OutputMode = "delta" | "full";

export interface TokenHygiene {
  context_block_policy: "summary_only";
  large_artifact_policy: "appendix_only";
  appendix_threshold_chars: number;
}

export interface PPSMeta {
  prompt_id: string;
  prompt_version: string;
  iteration_id: string;
  run_id: string;
  depth_mode: DepthMode;
  stack_prefs: string[];
  output_mode: OutputMode;
  output_format: typeof OUTPUT_FORMAT;
  gate_target: string;
  token_hygiene: TokenHygiene;
}

export interface PPSConstraints {
  team_size: string;
  timeline: string;
  budget: string;
  compliance_privacy: string;
  hosting_limits: string;
}

export interface PPSProject {
  name: string;
  brief: string;
  domain: string;
  users: string;
}

export interface ContractFreezeRef {
  label: string;
  openapi_appendix_id: string;
  updated_on: string;
}

export interface PPSState {
  decision_log: DecisionLogEntry[];
  open_questions: OpenQuestionEntry[];
  changelog: ChangeLogEntry[];
  change_requests: ChangeRequest[];
  contract_freeze_ref: ContractFreezeRef;
}

export interface PPSEnvelope {
  pps_version: typeof PPS_VERSION;
  meta: PPSMeta;
  constraints: PPSConstraints;
  project: PPSProject;
  context_block: string;
  appendices_index: AppendixRef[];
  state: PPSState;
  focus: Record<string, unknown>;
}

export function createDefaultTokenHygiene(): TokenHygiene {
  return {
    context_block_policy: "summary_only",
    large_artifact_policy: "appendix_only",
    appendix_threshold_chars: 4000,
  };
}

export function createDefaultMeta(overrides: Partial<PPSMeta> = {}): PPSMeta {
  return {
    prompt_id: "APP/00_placeholder",
    prompt_version: "1.2",
    iteration_id: new Date().toISOString().slice(0, 25),
    run_id: `RUN-${String(Date.now()).slice(-6)}`,
    depth_mode: "MVP",
    stack_prefs: [],
    output_mode: "delta",
    output_format: OUTPUT_FORMAT,
    gate_target: "N/A",
    token_hygiene: createDefaultTokenHygiene(),
    ...overrides,
  };
}
