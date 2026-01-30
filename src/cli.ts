#!/usr/bin/env node
/**
 * PPS CLI — validate, merge
 * Usage:
 *   pps validate envelope <path>
 *   pps validate result <path>
 *   pps merge <envelope-path> <result-path> [--state-in <path>] [--state-out <path>]
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { loadEnvelope, loadPromptResult, loadState, saveState } from "./io.js";
import { merge } from "./orchestrator/index.js";
import { validatePPSEnvelope, validatePromptResult } from "./validate.js";

const argv = process.argv.slice(2);

function usage(): never {
  const bin = "pps";
  console.error(`
Usage:
  ${bin} validate envelope <path>     Validate PPS v1.2 envelope YAML
  ${bin} validate result <path>       Validate PromptResult v1.2 YAML
  ${bin} merge <envelope> <result> [options]
    Merge result into pipeline state (OMS).
    Options:
      --state-in <path>   Load applied_index from state file for dedupe
      --state-out <path>  Write merged state to file
`);
  process.exit(1);
}

function resolvePath(p: string): string {
  const cwd = process.cwd();
  return path.isAbsolute(p) ? p : path.join(cwd, p);
}

function validateEnvelopeCmd(pathArg: string): void {
  const p = resolvePath(pathArg);
  if (!fs.existsSync(p)) {
    console.error(`File not found: ${p}`);
    process.exit(1);
  }
  const { envelope, validation } = loadEnvelope(p);
  if (!validation.ok) {
    console.error("Validation failed:");
    validation.errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }
  console.log("OK");
  console.log(`  pps_version: ${envelope.pps_version}`);
  console.log(`  meta.prompt_id: ${envelope.meta.prompt_id}`);
  console.log(`  meta.run_id: ${envelope.meta.run_id}`);
}

function validateResultCmd(pathArg: string): void {
  const p = resolvePath(pathArg);
  if (!fs.existsSync(p)) {
    console.error(`File not found: ${p}`);
    process.exit(1);
  }
  const { result, validation } = loadPromptResult(p);
  if (!validation.ok) {
    console.error("Validation failed:");
    validation.errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }
  console.log("OK");
  console.log(`  meta.prompt_id: ${result.meta.prompt_id}`);
  console.log(`  meta.run_id: ${result.meta.run_id}`);
  console.log(`  gate_result.status: ${result.gate_result.status}`);
}

function mergeCmd(
  envelopePath: string,
  resultPath: string,
  stateIn?: string,
  stateOut?: string
): void {
  const ep = resolvePath(envelopePath);
  const rp = resolvePath(resultPath);
  if (!fs.existsSync(ep)) {
    console.error(`Envelope file not found: ${ep}`);
    process.exit(1);
  }
  if (!fs.existsSync(rp)) {
    console.error(`Result file not found: ${rp}`);
    process.exit(1);
  }

  const { envelope, validation: ev } = loadEnvelope(ep);
  if (!ev.ok) {
    console.error("Envelope validation failed:");
    ev.errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }

  const { result, validation: rv } = loadPromptResult(rp);
  if (!rv.ok) {
    console.error("Result validation failed:");
    rv.errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }

  let appliedIndex: { prompt_id: string; run_id: string }[] | undefined;
  if (stateIn) {
    const sp = resolvePath(stateIn);
    if (!fs.existsSync(sp)) {
      console.error(`State file not found: ${sp}`);
      process.exit(1);
    }
    const state = loadState(sp);
    appliedIndex = state.applied_index;
  }

  const out = merge({
    envelope,
    result,
    applied_index: appliedIndex,
  });

  if (!out.ok) {
    console.error("Merge failed:");
    out.errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }

  if (out.warnings.length) {
    out.warnings.forEach((w) => console.warn(`WARN: ${w}`));
  }

  if (stateOut && out.state) {
    const sp = resolvePath(stateOut);
    saveState(sp, out.state);
    console.log(`State written to ${sp}`);
  }

  const summary = out.iteration_summary;
  if (summary) {
    console.log("\nIteration summary:");
    console.log(`  active_freeze_label: ${summary.active_freeze_label}`);
    console.log(`  gates_passed: ${summary.gates_passed.join(", ") || "(none)"}`);
    console.log(`  gates_failed: ${summary.gates_failed.join(", ") || "(none)"}`);
    if (summary.next_actions.length) {
      console.log("  next_actions:");
      summary.next_actions.forEach((a) => console.log(`    - ${a}`));
    }
  }
  console.log("Merge OK.");
}

function main(): void {
  if (argv.length < 1) usage();

  const cmd = argv[0];
  if (cmd === "validate") {
    if (argv.length < 3) usage();
    const sub = argv[1];
    const pathArg = argv[2];
    if (sub === "envelope") validateEnvelopeCmd(pathArg);
    else if (sub === "result") validateResultCmd(pathArg);
    else usage();
    return;
  }

  if (cmd === "merge") {
    if (argv.length < 3) usage();
    const envelopePath = argv[1];
    const resultPath = argv[2];
    let stateIn: string | undefined;
    let stateOut: string | undefined;
    for (let i = 3; i < argv.length; i++) {
      if (argv[i] === "--state-in" && argv[i + 1]) {
        stateIn = argv[++i];
      } else if (argv[i] === "--state-out" && argv[i + 1]) {
        stateOut = argv[++i];
      }
    }
    mergeCmd(envelopePath, resultPath, stateIn, stateOut);
    return;
  }

  usage();
}

main();
