/**
 * Prompt focus schemas (#1–#8) v1.2
 * See pps_v_1.md §7
 */

// #1 — APP/01_mvp-cutter (GATE_1_MVP_BOUNDED)
export interface Focus01MvpCutter {
  project_brief: string;
  constraints_override?: {
    team_size?: string;
    timeline?: string;
    budget?: string;
    compliance_privacy?: string;
  };
  existing_context_summary?: string;
}

// #2 — APP/02_ux-flows (GATE_2_TRACEABILITY_FLOW_SCREEN_STATE)
export interface Focus02UxFlows {
  mvp_scope: {
    in_scope: string[];
    out_of_scope: string[];
    acceptance_criteria: string[];
    success_metrics: string[];
  };
  constraints_notes?: string;
  ux_assumptions: {
    primary_user_roles: string[];
    primary_platform: string;
  };
}

// #3 — APP/03_architecture (GATE_3_TRUST_AND_CLASSIFICATION)
export interface Focus03Architecture {
  mvp_scope_summary: string;
  key_user_flows_summary: string;
  stack_prefs_override?: string[];
  nfr_targets_seed: {
    latency_p95_ms: number | null;
    availability_slo: string;
    error_rate_target: string;
    frontend_perf_budget: string;
    a11y_target: string;
    rate_limits_seed: string;
  };
  critical_endpoint_candidate: string;
}

// #4 — APP/04_data-api-contract (GATE_4_CONTRACT_FREEZE_V0)
export interface Focus04DataApiContract {
  existing_contract_freeze_label?: string;
  user_flows: Array<{
    name: string;
    description: string;
    screens_involved: string[];
    primary_actions: string[];
  }>;
  screens: Array<{
    route: string;
    purpose: string;
    permissions: string[];
    states: ("loading" | "empty" | "error")[];
  }>;
  arch_decisions_summary: string;
  nfr_targets: {
    latency_p95_ms: number | null;
    availability_slo: string;
    error_rate_target: string;
    rate_limits_targets: string;
  };
  contract_freeze_policy: {
    versioning_scheme: string;
    freeze_label: string;
    compatibility_rules_required: boolean;
  };
}

// #5 — APP/05_frontend-plan (GATE_5_CONTRACT_NO_DEVIATIONS)
export interface Focus05FrontendPlan {
  contract_freeze_label: string;
  screens: Array<{
    route: string;
    purpose: string;
    permissions: string[];
    states: ("loading" | "empty" | "error")[];
  }>;
  api_contract_ref: {
    appendix_id: string;
    summary: string;
  };
  canonical_vocab: {
    entities: string[];
    events: string[];
    endpoint_rules: string;
  };
  nfrs: {
    frontend_perf_budget: string;
    a11y_target: string;
  };
}

// #6 — APP/06_backend-plan (Gate: usually N/A)
export interface Focus06BackendPlan {
  contract_freeze_label: string;
  data_model_ref: {
    appendix_id: string;
    summary: string;
  };
  api_contract_ref: {
    appendix_id: string;
    summary: string;
  };
  trust_boundaries_summary: string;
  data_classification_summary: string;
  nfr_targets: {
    latency_p95_ms: number | null;
    availability_slo: string;
    error_rate_target: string;
  };
  observability_standards_seed: {
    trace_header: string;
    log_format: string;
    metrics_namespace: string;
  };
}

// #7 — APP/07_integrations-async-security (GATE_6_INTEGRATIONS_HARDENED)
export interface Focus07Integrations {
  integrations: Array<{
    name: string;
    purpose: string;
    direction: "outbound" | "inbound";
    auth_method: string;
    criticality: "low" | "medium" | "high";
  }>;
  endpoints_summary: string;
  jobs_seed: Array<{
    name: string;
    trigger: string;
    why_async: string;
  }>;
  data_retention_seed: {
    pii_retention_days: number | null;
    deletion_sla_days: number | null;
  };
  rate_limit_seed: {
    per_user_rpm: number | null;
    per_ip_rpm: number | null;
  };
}

// #8 — APP/08_release-ops (GATE_7_STAGING_REHEARSAL_AND_SLO_ALERTS)
export interface Focus08ReleaseOps {
  nfr_targets: {
    availability_slo: string;
    latency_p95_ms: number | null;
    error_rate_target: string;
  };
  observability_hooks_summary: string;
  contract_freeze_summary: string;
  migration_plan_ref: {
    appendix_id: string;
    summary: string;
  };
  environments_seed: string[];
  ci_preferences: {
    provider: string;
    required_checks: string[];
  };
}

export type FocusSchema =
  | Focus01MvpCutter
  | Focus02UxFlows
  | Focus03Architecture
  | Focus04DataApiContract
  | Focus05FrontendPlan
  | Focus06BackendPlan
  | Focus07Integrations
  | Focus08ReleaseOps;
