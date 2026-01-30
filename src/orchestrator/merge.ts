/**
 * OMS v1.0 — Orchestrator merge logic
 * See pps_v_1.md §8.2–8.9
 */

import { OUTPUT_FORMAT, createDefaultMeta } from "../schemas/pps.js";
import type { PPSEnvelope, PPSMeta } from "../schemas/pps.js";
import type { PromptResult } from "../schemas/prompt-result.js";
import {
  GATE_IDS,
  isContractFreezeAuthority,
  isFEorBE,
} from "../gates.js";
import type {
  AppliedEntry,
  MergeInput,
  MergeResult,
  PipelineState,
  IterationSummary,
} from "./types.js";
import type { AppendixRef } from "../schemas/shared.js";

const APPEND_ONLY_KEYS = new Set([
  "decision_log",
  "open_questions",
  "changelog",
]);

function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
  appendOnlyKeys: Set<string>
): void {
  for (const k of Object.keys(source)) {
    const v = source[k];
    if (appendOnlyKeys.has(k) && Array.isArray(v)) {
      const existing = target[k];
      if (Array.isArray(existing)) {
        (target as Record<string, unknown[]>)[k] = [...existing, ...v];
      } else {
        (target as Record<string, unknown>)[k] = [...v];
      }
      continue;
    }
    if (
      v != null &&
      typeof v === "object" &&
      !Array.isArray(v) &&
      target[k] != null &&
      typeof target[k] === "object" &&
      !Array.isArray(target[k])
    ) {
      deepMerge(
        target[k] as Record<string, unknown>,
        v as Record<string, unknown>,
        appendOnlyKeys
      );
    } else {
      target[k] = v;
    }
  }
}

function deepClone<T>(x: T): T {
  if (x == null || typeof x !== "object") return x;
  if (Array.isArray(x)) return x.map(deepClone) as T;
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(x as object)) {
    out[k] = deepClone((x as Record<string, unknown>)[k]);
  }
  return out as T;
}

function validateShape(result: PromptResult): string[] {
  const errs: string[] = [];
  if (!result.meta?.prompt_id) errs.push("prompt_result.meta.prompt_id required");
  if (!result.meta?.run_id) errs.push("prompt_result.meta.run_id required");
  if (!result.gate_result) errs.push("prompt_result.gate_result required");
  if (!result.appendices_updates) errs.push("prompt_result.appendices_updates required");
  if (!result.state_updates) errs.push("prompt_result.state_updates required");
  return errs;
}

function validateOutputFormat(result: PromptResult): string[] {
  const errs: string[] = [];
  const r = result as unknown as Record<string, unknown>;
  if (r.output_format !== undefined) {
    const of = r.output_format;
    if (of !== OUTPUT_FORMAT) {
      errs.push(`output_format must be "${OUTPUT_FORMAT}"`);
    }
  }
  return errs;
}

function validateGateSemantics(
  gateTarget: string,
  result: PromptResult
): string[] {
  const errs: string[] = [];
  const gr = result.gate_result;
  if (!gr) return errs;

  if (gateTarget === "N/A") {
    if (gr.status !== "na") {
      errs.push('gate_target is "N/A" but gate_result.status is not "na"');
    }
    return errs;
  }

  const validGates = new Set(GATE_IDS as readonly string[]);
  if (!validGates.has(gateTarget)) {
    errs.push(`unknown gate_target: ${gateTarget}`);
  }
  if (gr.gate_id !== gateTarget) {
    errs.push(`gate_result.gate_id (${gr.gate_id}) must match gate_target (${gateTarget})`);
  }
  if (gr.status !== "pass" && gr.status !== "fail") {
    errs.push(`gate_result.status must be "pass" or "fail" when gate_target is set`);
  }
  return errs;
}

function validateFreezePinning(
  envelope: MergeInput["envelope"],
  result: PromptResult
): string[] {
  const errs: string[] = [];
  const promptId = result.meta?.prompt_id ?? "";
  const applied = result.meta?.applied_to_freeze_label ?? "";
  const freezeLabel = envelope.state?.contract_freeze_ref?.label ?? "";
  const focusLabel = (envelope.focus as { contract_freeze_label?: string })?.contract_freeze_label;

  if (isFEorBE(promptId)) {
    if (focusLabel == null || focusLabel === "") {
      errs.push(`FE/BE prompt ${promptId} must receive focus.contract_freeze_label`);
    }
    if (applied === "") {
      errs.push(`FE/BE prompt must emit meta.applied_to_freeze_label`);
    }
    if (focusLabel != null && applied !== "" && applied !== focusLabel) {
      errs.push(
        `applied_to_freeze_label (${applied}) must match focus.contract_freeze_label (${focusLabel})`
      );
    }
    if (freezeLabel && applied !== freezeLabel) {
      errs.push(
        `applied_to_freeze_label (${applied}) must match state.contract_freeze_ref.label (${freezeLabel})`
      );
    }
  }

  return errs;
}

function validateAppendices(
  result: PromptResult,
  existingIds: Set<string>
): string[] {
  const errs: string[] = [];
  const added = result.appendices_updates?.added ?? [];
  const updated = result.appendices_updates?.updated ?? [];
  for (const a of added) {
    if (existingIds.has(a.id)) {
      errs.push(`appendices added: id "${a.id}" already exists`);
    }
  }
  for (const u of updated) {
    if (!existingIds.has(u.id)) {
      errs.push(`appendices updated: id "${u.id}" does not exist`);
    }
  }
  return errs;
}

function applyContextUpdates(
  context: Record<string, unknown>,
  updates: Record<string, unknown>
): void {
  if (!updates || typeof updates !== "object") return;
  deepMerge(context, updates as Record<string, unknown>, new Set());
}

function applyAppendices(
  appendices: AppendixRef[],
  added: AppendixRef[],
  updated: AppendixRef[]
): AppendixRef[] {
  const byId = new Map<string, AppendixRef>();
  for (const a of appendices) byId.set(a.id, { ...a });
  for (const u of updated) {
    if (byId.has(u.id)) byId.set(u.id, { ...u });
  }
  for (const a of added) {
    if (!byId.has(a.id)) byId.set(a.id, { ...a });
  }
  const order = appendices.map((a) => a.id);
  const addedIds = added.filter((a) => !order.includes(a.id)).map((a) => a.id);
  return [...order, ...addedIds].map((id) => byId.get(id)!);
}

function applyStateUpdates(state: PipelineState["state"], result: PromptResult): void {
  const su = result.state_updates ?? {};
  const d = su.decision_log_added ?? [];
  const q = su.open_questions_added ?? [];
  const c = su.changelog_added ?? [];
  const cr = su.change_requests_added ?? [];
  state.decision_log.push(...d);
  state.open_questions.push(...q);
  state.changelog.push(...c);
  state.change_requests.push(...cr);

  const meta = result.meta ?? {};
  const freezeRef = (result as unknown as { contract_freeze_ref?: typeof state.contract_freeze_ref })
    ?.contract_freeze_ref;
  if (freezeRef && isContractFreezeAuthority(meta.prompt_id as string)) {
    state.contract_freeze_ref = { ...state.contract_freeze_ref, ...freezeRef };
  }
}

function runConsistencyChecks(state: PipelineState): string[] {
  const errs: string[] = [];
  const ref = state.state.contract_freeze_ref;
  if (ref?.label && ref?.openapi_appendix_id) {
    const exists = state.appendices_index.some((a) => a.id === ref.openapi_appendix_id);
    if (!exists) {
      errs.push(
        `contract_freeze_ref references OpenAPI appendix "${ref.openapi_appendix_id}" which is not in appendices_index`
      );
    }
  }
  return errs;
}

function buildIterationSummary(
  state: PipelineState,
  result: PromptResult
): IterationSummary {
  const gr = result.gate_result ?? { gate_id: "", status: "na" as const, next_actions: [] };
  const gatesPassed = gr.status === "pass" && gr.gate_id ? [gr.gate_id] : [];
  const gatesFailed = gr.status === "fail" && gr.gate_id ? [gr.gate_id] : [];
  return {
    decisions_made: state.state.decision_log,
    open_questions: state.state.open_questions,
    changelog_entries: state.state.changelog,
    active_freeze_label: state.state.contract_freeze_ref?.label ?? "",
    gates_passed: gatesPassed,
    gates_failed: gatesFailed,
    next_actions: gr.next_actions ?? [],
  };
}

export function initialStateFromEnvelope(envelope: MergeInput["envelope"]): PipelineState {
  return {
    context: { context_block: envelope.context_block ?? "" },
    appendices_index: [...(envelope.appendices_index ?? [])],
    state: {
      decision_log: [...(envelope.state?.decision_log ?? [])],
      open_questions: [...(envelope.state?.open_questions ?? [])],
      changelog: [...(envelope.state?.changelog ?? [])],
      change_requests: [...(envelope.state?.change_requests ?? [])],
      contract_freeze_ref: {
        ...(envelope.state?.contract_freeze_ref ?? {
          label: "",
          openapi_appendix_id: "",
          updated_on: "",
        }),
      },
    },
    applied_index: [],
  };
}

/**
 * Build next PPS envelope from base + pipeline state + meta overrides + focus.
 * Use when running a sequence: after merge, build envelope for the next prompt.
 */
export function envelopeFromState(
  base: PPSEnvelope,
  pipelineState: PipelineState,
  metaOverrides: Partial<PPSMeta> & { prompt_id: string; run_id: string },
  focus: Record<string, unknown>
): PPSEnvelope {
  const contextBlock =
    (typeof pipelineState.context?.context_block === "string"
      ? pipelineState.context.context_block
      : "") ?? "";
  return {
    ...base,
    context_block: contextBlock,
    appendices_index: [...pipelineState.appendices_index],
    state: {
      decision_log: [...pipelineState.state.decision_log],
      open_questions: [...pipelineState.state.open_questions],
      changelog: [...pipelineState.state.changelog],
      change_requests: [...pipelineState.state.change_requests],
      contract_freeze_ref: { ...pipelineState.state.contract_freeze_ref },
    },
    meta: createDefaultMeta({
      ...base.meta,
      ...metaOverrides,
    }),
    focus: { ...focus },
  };
}

export function merge(input: MergeInput): MergeResult {
  const {
    envelope,
    result,
    applied_index: priorApplied = [],
    appendix_threshold_chars = 4000,
  } = input;
  const errors: string[] = [];
  const warnings: string[] = [...(result.warnings ?? [])];

  const key: AppliedEntry = {
    prompt_id: result.meta?.prompt_id ?? "",
    run_id: result.meta?.run_id ?? "",
  };
  const dedupeKey = `${key.prompt_id}:${key.run_id}`;
  const seen = new Set(priorApplied.map((e) => `${e.prompt_id}:${e.run_id}`));
  if (seen.has(dedupeKey)) {
    return {
      ok: true,
      state: undefined,
      applied_index: undefined,
      errors: [],
      warnings: ["Duplicate (prompt_id, run_id): no-op"],
    };
  }

  errors.push(...validateShape(result));
  errors.push(...validateOutputFormat(result));
  if (errors.length) {
    return { ok: false, errors, warnings };
  }

  const gateTarget = envelope.meta?.gate_target ?? "N/A";
  errors.push(...validateGateSemantics(gateTarget, result));
  errors.push(...validateFreezePinning(envelope, result));

  const existingIds = new Set(
    (envelope.appendices_index ?? []).map((a) => a.id)
  );
  errors.push(...validateAppendices(result, existingIds));
  if (errors.length) {
    return { ok: false, errors, warnings };
  }

  let pipelineState: PipelineState = {
    ...initialStateFromEnvelope(envelope),
    applied_index: [...priorApplied],
  };
  pipelineState = deepClone(pipelineState) as PipelineState;

  applyContextUpdates(
    pipelineState.context,
    (result.context_updates ?? {}) as Record<string, unknown>
  );
  pipelineState.appendices_index = applyAppendices(
    pipelineState.appendices_index,
    result.appendices_updates?.added ?? [],
    result.appendices_updates?.updated ?? []
  );
  applyStateUpdates(pipelineState.state, result);

  const consistencyErrors = runConsistencyChecks(pipelineState);
  if (consistencyErrors.length) {
    warnings.push(...consistencyErrors);
  }

  const threshold =
    envelope.meta?.token_hygiene?.appendix_threshold_chars ?? appendix_threshold_chars;
  const ctx = (result.context_updates ?? {}) as Record<string, unknown>;
  for (const [k, v] of Object.entries(ctx)) {
    if (v == null) continue;
    const s = typeof v === "string" ? v : JSON.stringify(v);
    if (typeof s === "string" && s.length > threshold) {
      warnings.push(
        `token_hygiene: context_updates.${k} exceeds ${threshold} chars; consider moving to appendix`
      );
    }
  }

  pipelineState.applied_index.push(key);
  const iteration_summary = buildIterationSummary(pipelineState, result);

  return {
    ok: true,
    state: pipelineState,
    applied_index: pipelineState.applied_index,
    iteration_summary,
    errors: [],
    warnings,
  };
}
