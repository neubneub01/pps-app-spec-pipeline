/**
 * OMS v1.0 merge — basic tests
 */

import { merge, initialStateFromEnvelope, envelopeFromState } from "./merge.js";
import type { PPSEnvelope } from "../schemas/pps.js";
import type { PromptResult } from "../schemas/prompt-result.js";
import { createDefaultMeta } from "../schemas/pps.js";
import { createEmptyPromptResult } from "../schemas/prompt-result.js";

function minimalEnvelope(overrides: Partial<PPSEnvelope> = {}): PPSEnvelope {
  return {
    pps_version: "1.2",
    meta: createDefaultMeta({
      prompt_id: "APP/01_mvp-cutter",
      run_id: "RUN-001",
      gate_target: "N/A",
    }),
    constraints: { team_size: "", timeline: "", budget: "", compliance_privacy: "", hosting_limits: "" },
    project: { name: "", brief: "", domain: "", users: "" },
    context_block: "",
    appendices_index: [],
    state: {
      decision_log: [],
      open_questions: [],
      changelog: [],
      change_requests: [],
      contract_freeze_ref: { label: "", openapi_appendix_id: "", updated_on: "" },
    },
    focus: {},
    ...overrides,
  };
}

function minimalResult(overrides: Partial<PromptResult> = {}): PromptResult {
  const r = createEmptyPromptResult({
    prompt_id: "APP/01_mvp-cutter",
    run_id: "RUN-001",
  });
  return { ...r, gate_result: { ...r.gate_result!, status: "na" as const }, ...overrides };
}

describe("merge", () => {
  it("dedupes on (prompt_id, run_id)", () => {
    const envelope = minimalEnvelope();
    const result = minimalResult();
    const first = merge({ envelope, result, applied_index: [] });
    expect(first.ok).toBe(true);
    expect(first.state).toBeDefined();

    const second = merge({
      envelope,
      result,
      applied_index: first.applied_index ?? [],
    });
    expect(second.ok).toBe(true);
    expect(second.state).toBeUndefined();
    expect(second.warnings).toContain("Duplicate (prompt_id, run_id): no-op");
  });

  it("validates gate_target N/A requires status na", () => {
    const envelope = minimalEnvelope();
    const result = minimalResult();
    result.gate_result!.status = "pass";
    result.gate_result!.gate_id = "GATE_1_MVP_BOUNDED";
    const out = merge({ envelope, result, applied_index: [] });
    expect(out.ok).toBe(false);
    expect(out.errors.some((e) => e.includes("N/A") && e.includes("na"))).toBe(true);
  });

  it("applies context_updates and state_updates", () => {
    const envelope = minimalEnvelope();
    const result = minimalResult();
    result.context_updates = { foo: "bar" };
    result.state_updates!.decision_log_added = [
      { date: "2026-01-28", decision: "D1", rationale: "R1", impact: "I1", owner: "O1" },
    ];
    const out = merge({ envelope, result, applied_index: [] });
    expect(out.ok).toBe(true);
    expect(out.state!.context.foo).toBe("bar");
    expect(out.state!.state.decision_log).toHaveLength(1);
    expect(out.state!.state.decision_log[0]!.decision).toBe("D1");
  });
});

describe("initialStateFromEnvelope", () => {
  it("builds pipeline state from envelope", () => {
    const envelope = minimalEnvelope();
    const state = initialStateFromEnvelope(envelope);
    expect(state.context.context_block).toBe("");
    expect(state.appendices_index).toEqual([]);
    expect(state.state.decision_log).toEqual([]);
    expect(state.applied_index).toEqual([]);
  });
});

describe("envelopeFromState", () => {
  it("builds next envelope from pipeline state and meta overrides", () => {
    const base = minimalEnvelope();
    const result = minimalResult();
    result.context_updates = { context_block: "updated summary" };
    const out = merge({ envelope: base, result, applied_index: [] });
    expect(out.ok).toBe(true);
    const state = out.state!;
    const next = envelopeFromState(base, state, {
      prompt_id: "APP/02_ux-flows",
      run_id: "RUN-002",
      gate_target: "GATE_2_TRACEABILITY_FLOW_SCREEN_STATE",
    }, { foo: "bar" });
    expect(next.context_block).toBe("updated summary");
    expect(next.meta.prompt_id).toBe("APP/02_ux-flows");
    expect(next.meta.run_id).toBe("RUN-002");
    expect(next.meta.gate_target).toBe("GATE_2_TRACEABILITY_FLOW_SCREEN_STATE");
    expect(next.focus).toEqual({ foo: "bar" });
  });
});
