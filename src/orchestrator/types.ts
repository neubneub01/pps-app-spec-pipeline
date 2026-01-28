/**
 * OMS v1.0 — Orchestrator types
 * See pps_v_1.md §8
 */

import type {
  AppendixRef,
  ChangeLogEntry,
  ChangeRequest,
  DecisionLogEntry,
  OpenQuestionEntry,
} from "../schemas/shared.js";
import type { ContractFreezeRef, PPSEnvelope } from "../schemas/pps.js";
import type { PromptResult } from "../schemas/prompt-result.js";

export interface AppliedEntry {
  prompt_id: string;
  run_id: string;
}

export interface PipelineContext {
  [key: string]: unknown;
}

export interface PipelineState {
  context: PipelineContext;
  appendices_index: AppendixRef[];
  state: {
    decision_log: DecisionLogEntry[];
    open_questions: OpenQuestionEntry[];
    changelog: ChangeLogEntry[];
    change_requests: ChangeRequest[];
    contract_freeze_ref: ContractFreezeRef;
  };
  applied_index: AppliedEntry[];
}

export interface MergeInput {
  envelope: PPSEnvelope;
  result: PromptResult;
  /** Orchestrator-held applied index for dedupe. Key: (prompt_id, run_id). */
  applied_index?: AppliedEntry[];
  appendix_threshold_chars?: number;
}

export interface IterationSummary {
  decisions_made: DecisionLogEntry[];
  open_questions: OpenQuestionEntry[];
  changelog_entries: ChangeLogEntry[];
  active_freeze_label: string;
  gates_passed: string[];
  gates_failed: string[];
  next_actions: string[];
}

export interface MergeResult {
  ok: boolean;
  state?: PipelineState;
  applied_index?: AppliedEntry[];
  iteration_summary?: IterationSummary;
  errors: string[];
  warnings: string[];
}
