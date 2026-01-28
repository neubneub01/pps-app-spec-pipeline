/**
 * PromptResult v1.2 — Standard Output Patch
 * See pps_v_1.md §4
 */

import type {
  AppendixRef,
  ChangeLogEntry,
  ChangeRequest,
  DecisionLogEntry,
  OpenQuestionEntry,
} from "./shared.js";

export type GateStatus = "pass" | "fail" | "na";

export interface PromptResultMeta {
  prompt_id: string;
  prompt_version: string;
  iteration_id: string;
  run_id: string;
  applied_to_freeze_label: string;
}

export interface PromptResult {
  meta: PromptResultMeta;
  context_updates: Record<string, unknown>;
  appendices_updates: {
    added: AppendixRef[];
    updated: AppendixRef[];
  };
  state_updates: {
    decision_log_added: DecisionLogEntry[];
    open_questions_added: OpenQuestionEntry[];
    changelog_added: ChangeLogEntry[];
    change_requests_added: ChangeRequest[];
  };
  gate_result: {
    gate_id: string;
    status: GateStatus;
    reason: string;
    blockers: string[];
    next_actions: string[];
  };
  warnings: string[];
}

export function createEmptyPromptResult(
  meta: Partial<PromptResultMeta> & Pick<PromptResultMeta, "prompt_id" | "run_id">
): PromptResult {
  return {
    meta: {
      prompt_version: "1.2",
      iteration_id: "",
      applied_to_freeze_label: "",
      ...meta,
    },
    context_updates: {},
    appendices_updates: { added: [], updated: [] },
    state_updates: {
      decision_log_added: [],
      open_questions_added: [],
      changelog_added: [],
      change_requests_added: [],
    },
    gate_result: {
      gate_id: "",
      status: "na",
      reason: "",
      blockers: [],
      next_actions: [],
    },
    warnings: [],
  };
}
