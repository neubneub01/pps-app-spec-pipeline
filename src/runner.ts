/**
 * Runner script for automated pipeline execution
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import type { PPSEnvelope } from "./schemas/pps.js";
import type { PromptResult } from "./schemas/prompt-result.js";
import type { PipelineState } from "./orchestrator/types.js";
import {
  merge,
  initialStateFromEnvelope,
  envelopeFromState,
} from "./orchestrator/index.js";
import { callLLM, type LLMConfig } from "./llm.js";
import { createDefaultMeta } from "./schemas/pps.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface RunPipelineOptions {
  projectName: string;
  projectBrief: string;
  domain?: string;
  teamSize?: number;
  timeline?: string;
  budget?: string;
  llmConfig: LLMConfig;
  onProgress?: (step: number, promptId: string, status: string) => void;
}

export interface RunPipelineResult {
  success: boolean;
  state: PipelineState;
  errors: string[];
}

const PROMPT_IDS = [
  "APP/01_mvp-cutter",
  "APP/02_ux-flows",
  "APP/03_architecture",
  "APP/04_data-api-contract",
  "APP/05_frontend",
  "APP/06_backend",
  "APP/07_integrations",
  "APP/08_release-ops",
];

/**
 * Load prompt template from prompts/ directory
 */
function loadPromptTemplate(promptId: string): string {
  const templatePath = join(__dirname, "..", "prompts", `${promptId}.txt`);
  return readFileSync(templatePath, "utf-8");
}

/**
 * Create initial envelope from project brief
 */
function createInitialEnvelope(options: RunPipelineOptions): PPSEnvelope {
  const {
    projectName,
    projectBrief,
    domain = "general",
    teamSize = 2,
    timeline = "8 weeks",
    budget = "startup",
  } = options;

  const envelope: PPSEnvelope = {
    pps_version: "1.2",
    meta: createDefaultMeta({
      prompt_id: "APP/01_mvp-cutter",
      run_id: `RUN-${Date.now()}`,
      gate_target: "GATE_1_MVP_BOUNDED",
      depth_mode: "MVP",
    }),
    project: {
      name: projectName,
      brief: projectBrief,
      domain,
      users: "general users",
    },
    constraints: {
      team_size: String(teamSize),
      timeline,
      budget,
      compliance_privacy: "standard",
      hosting_limits: "none",
    },
    context_block: "",
    appendices_index: [],
    state: {
      decision_log: [],
      open_questions: [],
      changelog: [],
      change_requests: [],
      contract_freeze_ref: {
        label: "",
        openapi_appendix_id: "",
        updated_on: "",
      },
    },
    focus: {},
  };

  return envelope;
}

/**
 * Run the full pipeline (APP/01 → APP/08)
 */
export async function runPipeline(
  options: RunPipelineOptions
): Promise<RunPipelineResult> {
  const { llmConfig, onProgress } = options;
  const errors: string[] = [];

  // Create initial envelope
  const baseEnvelope = createInitialEnvelope(options);
  let state = initialStateFromEnvelope(baseEnvelope);

  // Run each prompt in sequence
  for (let i = 0; i < PROMPT_IDS.length; i++) {
    const promptId = PROMPT_IDS[i];

    try {
      onProgress?.(i + 1, promptId, "loading template");

      // Load prompt template
      const template = loadPromptTemplate(promptId);

      onProgress?.(i + 1, promptId, "building envelope");

      // Build envelope for this step
      const gateTarget = getGateTarget(promptId);
      const envelope = envelopeFromState(
        baseEnvelope,
        state,
        {
          prompt_id: promptId,
          run_id: `RUN-${Date.now()}-${i + 1}`,
          gate_target: gateTarget,
        },
        {} // Empty focus for now (could be customized per prompt)
      );

      onProgress?.(i + 1, promptId, "calling LLM");

      // Call LLM
      const result: PromptResult = await callLLM({
        envelope,
        promptTemplate: template,
        config: llmConfig,
      });

      onProgress?.(i + 1, promptId, "merging result");

      // Merge result into state
      const mergeResult = merge({
        envelope,
        result,
        applied_index: state.applied_index,
      });

      if (!mergeResult.ok) {
        errors.push(`${promptId}: ${mergeResult.errors.join(", ")}`);
        return { success: false, state, errors };
      }

      state = mergeResult.state!;

      onProgress?.(i + 1, promptId, "complete");
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : String(error);
      errors.push(`${promptId}: ${errorMsg}`);
      return { success: false, state, errors };
    }
  }

  return { success: true, state, errors };
}

/**
 * Get gate target for a given prompt ID
 */
function getGateTarget(promptId: string): string {
  const gateMap: Record<string, string> = {
    "APP/01_mvp-cutter": "GATE_1_MVP_BOUNDED",
    "APP/02_ux-flows": "GATE_2_TRACEABILITY_FLOW_SCREEN_STATE",
    "APP/03_architecture": "GATE_3_TRUST_AND_CLASSIFICATION",
    "APP/04_data-api-contract": "GATE_4_CONTRACT_FREEZE_V0",
    "APP/05_frontend": "GATE_5_CONTRACT_NO_DEVIATIONS",
    "APP/06_backend": "N/A",
    "APP/07_integrations": "GATE_6_INTEGRATIONS_HARDENED",
    "APP/08_release-ops": "GATE_7_STAGING_REHEARSAL_AND_SLO_ALERTS",
  };
  return gateMap[promptId] ?? "N/A";
}
