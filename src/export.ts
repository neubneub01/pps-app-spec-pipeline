/**
 * Export artifacts from pipeline state
 */

import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import type { PipelineState } from "./orchestrator/types.js";

export interface ExportOptions {
  outputDir: string;
  state: PipelineState;
}

/**
 * Export all artifacts from pipeline state to output directory
 */
export function exportArtifacts(options: ExportOptions): void {
  const { outputDir, state } = options;

  // Create output directory
  mkdirSync(outputDir, { recursive: true });

  // Export OpenAPI spec
  const openapiAppendix = state.appendices_index.find(
    (a) => a.kind === "openapi"
  );
  if (openapiAppendix) {
    const openapiPath = join(outputDir, "openapi.yaml");
    // Note: AppendixRef doesn't have content, need to get from context
    // For now, just note the location
    console.log(`✓ OpenAPI spec reference: ${openapiAppendix.location}`);
  }

  // Export migrations
  const migrationsAppendix = state.appendices_index.find(
    (a) => a.kind === "migrations"
  );
  if (migrationsAppendix) {
    const migrationsPath = join(outputDir, "migrations.sql");
    console.log(`✓ Migrations reference: ${migrationsAppendix.location}`);
  }

  // Export decision log as markdown
  if (state.state.decision_log.length > 0) {
    const decisionsPath = join(outputDir, "decisions.md");
    const decisionsContent = formatDecisionLog(state.state.decision_log);
    writeFileSync(decisionsPath, decisionsContent, "utf-8");
    console.log(`✓ Exported decision log to ${decisionsPath}`);
  }

  // Export changelog as markdown
  if (state.state.changelog.length > 0) {
    const changelogPath = join(outputDir, "CHANGELOG.md");
    const changelogContent = formatChangelog(state.state.changelog);
    writeFileSync(changelogPath, changelogContent, "utf-8");
    console.log(`✓ Exported changelog to ${changelogPath}`);
  }

  // Export open questions as markdown
  if (state.state.open_questions.length > 0) {
    const questionsPath = join(outputDir, "open-questions.md");
    const questionsContent = formatOpenQuestions(state.state.open_questions);
    writeFileSync(questionsPath, questionsContent, "utf-8");
    console.log(`✓ Exported open questions to ${questionsPath}`);
  }

  // Export full state as JSON
  const statePath = join(outputDir, "state.json");
  writeFileSync(statePath, JSON.stringify(state, null, 2), "utf-8");
  console.log(`✓ Exported full state to ${statePath}`);
}

/**
 * Format decision log as markdown
 */
function formatDecisionLog(
  decisions: Array<{
    date: string;
    decision: string;
    rationale: string;
    impact: string;
  }>
): string {
  let md = "# Decision Log\n\n";
  md +=
    "This document tracks all key decisions made during the app spec creation process.\n\n";

  for (const d of decisions) {
    md += `## ${d.date}: ${d.decision}\n\n`;
    md += `**Rationale:** ${d.rationale}\n\n`;
    md += `**Impact:** ${d.impact}\n\n`;
    md += "---\n\n";
  }

  return md;
}

/**
 * Format changelog as markdown
 */
function formatChangelog(
  changelog: Array<{
    date: string;
    changed_area: string;
    change: string;
    reason: string;
    compatibility: string;
    impact: string;
  }>
): string {
  let md = "# Changelog\n\n";
  md +=
    "This document tracks all changes made to the spec during the pipeline run.\n\n";

  for (const c of changelog) {
    md += `## ${c.date}: ${c.change}\n\n`;
    md += `**Area:** ${c.changed_area}\n\n`;
    md += `**Reason:** ${c.reason}\n\n`;
    md += `**Compatibility:** ${c.compatibility}\n\n`;
    md += `**Impact:** ${c.impact}\n\n`;
    md += "---\n\n";
  }

  return md;
}

/**
 * Format open questions as markdown
 */
function formatOpenQuestions(
  questions: Array<{
    id: string;
    question: string;
    context: string;
    options: string[];
    recommended: string;
    owner: string;
    due_by: string;
  }>
): string {
  let md = "# Open Questions\n\n";
  md +=
    "These questions need to be resolved before implementation can proceed.\n\n";

  for (const q of questions) {
    md += `## ${q.question}\n\n`;
    md += `**ID:** ${q.id}\n\n`;
    md += `**Context:** ${q.context}\n\n`;
    md += `**Options:**\n`;
    for (const opt of q.options) {
      md += `- ${opt}\n`;
    }
    md += `\n**Recommended:** ${q.recommended}\n\n`;
    md += `**Owner:** ${q.owner}\n\n`;
    md += `**Due by:** ${q.due_by}\n\n`;
    md += "---\n\n";
  }

  return md;
}
