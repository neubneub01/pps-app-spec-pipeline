/**
 * Shared object schemas v1.2 — PPS App Spec Pipeline
 * See pps_v_1.md §3
 */

export interface DecisionLogEntry {
  id?: string;
  date: string;
  decision: string;
  rationale: string;
  impact: string;
  owner: string;
}

export interface OpenQuestionEntry {
  id: string;
  question: string;
  context: string;
  options: string[];
  recommended: string;
  owner: string;
  due_by: string;
}

export type ChangedArea =
  | "MVP_SCOPE"
  | "API_CONTRACT"
  | "ARCH_DECISIONS"
  | "DATA_MODEL"
  | string;

export interface ChangeLogEntry {
  date: string;
  changed_area: ChangedArea;
  change: string;
  reason: string;
  compatibility: "patch" | "minor" | "major";
  impact: string;
}

export type AppendixKind =
  | "openapi"
  | "migrations"
  | "ui_catalog"
  | "ci_yaml"
  | "other";

export interface AppendixRef {
  id: string;
  kind: AppendixKind;
  summary: string;
  location: string;
  produced_by: string;
  updated_on: string;
}

export type ChangeRequestArea =
  | "API_CONTRACT"
  | "DATA_MODEL"
  | "UX"
  | "ARCH"
  | "NFR";

export interface ChangeRequest {
  id: string;
  area: ChangeRequestArea;
  requested_by: string;
  depends_on_freeze_label: string;
  description: string;
  reason: string;
  proposed_change: string;
  compatibility: "patch" | "minor" | "major";
  status: "open" | "accepted" | "rejected";
}
