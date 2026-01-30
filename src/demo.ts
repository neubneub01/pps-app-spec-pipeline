/**
 * Demo pipeline run: load base envelope, merge stub APP/01 and APP/02, save state, print summary.
 * Run from project root: npm run demo
 */

import * as path from "node:path";
import { loadEnvelope, saveState } from "./io.js";
import { merge, envelopeFromState } from "./orchestrator/index.js";
import { stubResult } from "./stubs.js";
import { createDefaultMeta } from "./schemas/pps.js";

const DEMO_STATE_PATH = ".demo-state.json";

function resolveTemplate(name: string): string {
  return path.join(process.cwd(), "templates", name);
}

function main(): void {
  console.log("PPS Demo — stub APP/01 -> merge -> APP/02 -> merge\n");

  const envelopePath = resolveTemplate("pps-envelope.example.yaml");
  const { envelope: base, validation } = loadEnvelope(envelopePath);
  if (!validation.ok) {
    console.error("Envelope validation failed:");
    validation.errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }

  // Run 1: APP/01
  const meta1 = createDefaultMeta({
    prompt_id: "APP/01_mvp-cutter",
    run_id: "RUN-DEMO-001",
    gate_target: "GATE_1_MVP_BOUNDED",
  });
  const env1 = { ...base, meta: { ...base.meta, ...meta1 } };
  const result1 = stubResult({
    prompt_id: "APP/01_mvp-cutter",
    run_id: "RUN-DEMO-001",
    gate_target: "GATE_1_MVP_BOUNDED",
    status: "pass",
  });

  const out1 = merge({
    envelope: env1,
    result: result1,
    applied_index: [],
  });

  if (!out1.ok) {
    console.error("Merge 1 failed:", out1.errors);
    process.exit(1);
  }

  const state1 = out1.state!;
  saveState(DEMO_STATE_PATH, state1);
  console.log("Merge 1 OK (APP/01). State saved to", DEMO_STATE_PATH);
  if (out1.iteration_summary) {
    console.log("  gates_passed:", out1.iteration_summary.gates_passed.join(", "));
  }

  // Run 2: APP/02 (envelope from state)
  const meta2 = createDefaultMeta({
    prompt_id: "APP/02_ux-flows",
    run_id: "RUN-DEMO-002",
    gate_target: "GATE_2_TRACEABILITY_FLOW_SCREEN_STATE",
  });
  const env2 = envelopeFromState(base, state1, meta2, {});
  const result2 = stubResult({
    prompt_id: "APP/02_ux-flows",
    run_id: "RUN-DEMO-002",
    gate_target: "GATE_2_TRACEABILITY_FLOW_SCREEN_STATE",
    status: "pass",
  });

  const out2 = merge({
    envelope: env2,
    result: result2,
    applied_index: state1.applied_index,
  });

  if (!out2.ok) {
    console.error("Merge 2 failed:", out2.errors);
    process.exit(1);
  }

  const state2 = out2.state!;
  saveState(DEMO_STATE_PATH, state2);
  console.log("\nMerge 2 OK (APP/02). State updated at", DEMO_STATE_PATH);
  if (out2.iteration_summary) {
    console.log("  gates_passed:", out2.iteration_summary.gates_passed.join(", "));
  }

  console.log("\n--- Iteration summary ---");
  const s = out2.iteration_summary!;
  console.log("  active_freeze_label:", s.active_freeze_label || "(none)");
  console.log("  gates_passed:", s.gates_passed.length ? s.gates_passed.join(", ") : "(none)");
  console.log("  gates_failed:", s.gates_failed.length ? s.gates_failed.join(", ") : "(none)");
  console.log("  applied_index:", state2.applied_index.length, "entries");
  console.log("\nDemo done.");
}

main();
