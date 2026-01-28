/**
 * PPS v1.2 App Spec Pipeline — Canonical System
 * Contract-first, gate-driven spec pipeline.
 *
 * - Input: PPS v1.2 envelope
 * - Output: PromptResult v1.2 (delta patch)
 * - Gates: 7 standard gates
 * - Orchestrator: OMS v1.0 merge algorithm
 */

export * from "./schemas/index.js";
export * from "./gates.js";
export * from "./orchestrator/index.js";
export * from "./validate.js";
export * from "./io.js";
