/**
 * OMS v1.0 — Orchestrator Merge Algorithm
 * See pps_v_1.md §8
 */

export { merge, initialStateFromEnvelope } from "./merge.js";
export type {
  MergeInput,
  MergeResult,
  PipelineState,
  AppliedEntry,
  IterationSummary,
  PipelineContext,
} from "./types.js";
