#!/usr/bin/env node
/**
 * PPS CLI — validate, merge, run
 * Usage:
 *   pps validate envelope <path>
 *   pps validate result <path>
 *   pps merge <envelope-path> <result-path> [--state-in <path>] [--state-out <path>]
 *   pps run --brief "..." --api-key "..." [options]
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { loadEnvelope, loadPromptResult, loadState, saveState } from "./io.js";
import { merge } from "./orchestrator/index.js";
import { validatePPSEnvelope, validatePromptResult } from "./validate.js";
import { runPipeline } from "./runner.js";
import { exportArtifacts } from "./export.js";

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
  
  ${bin} run --brief "..." --api-key "..." [options]
    Run full pipeline (APP/01 → APP/08) with LLM automation.
    Required:
      --brief <text>      Project brief (what you want to build)
      --api-key <key>     Anthropic API key
    Optional:
      --name <name>       Project name (default: from brief)
      --domain <domain>   Domain (default: general)
      --team <size>       Team size (default: 2)
      --timeline <time>   Timeline (default: 8 weeks)
      --budget <budget>   Budget (default: startup)
      --output <dir>      Output directory (default: ./spec)
      --model <model>     Claude model (default: claude-3-5-sonnet-20241022)
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

async function runCmd(args: string[]): Promise<void> {
  let brief = "";
  let apiKey = "";
  let projectName = "";
  let domain = "general";
  let teamSize = 2;
  let timeline = "8 weeks";
  let budget = "startup";
  let outputDir = "./spec";
  let model = "claude-3-5-sonnet-20241022";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--brief" && args[i + 1]) {
      brief = args[++i];
    } else if (args[i] === "--api-key" && args[i + 1]) {
      apiKey = args[++i];
    } else if (args[i] === "--name" && args[i + 1]) {
      projectName = args[++i];
    } else if (args[i] === "--domain" && args[i + 1]) {
      domain = args[++i];
    } else if (args[i] === "--team" && args[i + 1]) {
      teamSize = parseInt(args[++i], 10);
    } else if (args[i] === "--timeline" && args[i + 1]) {
      timeline = args[++i];
    } else if (args[i] === "--budget" && args[i + 1]) {
      budget = args[++i];
    } else if (args[i] === "--output" && args[i + 1]) {
      outputDir = args[++i];
    } else if (args[i] === "--model" && args[i + 1]) {
      model = args[++i];
    }
  }

  if (!brief || !apiKey) {
    console.error("Error: --brief and --api-key are required");
    usage();
  }

  if (!projectName) {
    projectName = brief.slice(0, 50).replace(/[^a-zA-Z0-9\s]/g, "").trim();
  }

  console.log("Starting pipeline run...");
  console.log(`  Project: ${projectName}`);
  console.log(`  Brief: ${brief}`);
  console.log(`  Model: ${model}`);
  console.log("");

  const result = await runPipeline({
    projectName,
    projectBrief: brief,
    domain,
    teamSize,
    timeline,
    budget,
    llmConfig: { apiKey, model },
    onProgress: (step, promptId, status) => {
      console.log(`[${step}/8] ${promptId}: ${status}`);
    },
  });

  if (!result.success) {
    console.error("\nPipeline failed:");
    result.errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }

  console.log("\n✓ Pipeline complete!");
  console.log("\nExporting artifacts...");

  exportArtifacts({
    outputDir: resolvePath(outputDir),
    state: result.state,
  });

  console.log(`\n✓ All artifacts exported to ${outputDir}/`);
  console.log("\nNext steps:");
  console.log(`  1. Review ${outputDir}/openapi.yaml (API contract)`);
  console.log(`  2. Review ${outputDir}/migrations.sql (database schema)`);
  console.log(`  3. Review ${outputDir}/decisions.md (key decisions)`);
  console.log(`  4. Start implementing!`);
}

async function main(): Promise<void> {
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

  if (cmd === "run") {
    await runCmd(argv.slice(1));
    return;
  }

  usage();
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
