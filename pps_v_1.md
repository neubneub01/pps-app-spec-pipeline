# PPS v1.2 App Spec Pipeline — Canonical System

## 0) What this is
A contract-first, gate-driven spec pipeline for building apps with repeatable, automation-ready inputs/outputs.

- **Input standard:** PPS v1.2 (single envelope for all prompts)
- **Output standard:** PromptResult v1.2 (delta patch)
- **Gates:** 7 standard gates
- **Freeze model:** Contract Freeze + Change Requests handshake (CF rules)
- **Orchestrator:** OMS v1.0 merge algorithm (deterministic application)

---

## 1) Normative rules

### R0 — Envelope + Output Shape
- Every run **MUST** use PPS v1.2.
- Every prompt **MUST** output exactly `output_format: prompt_result_v1.2`.

### R1 — Dedupe / Retry Safety
- `meta.run_id` MUST be unique per execution.
- Orchestrator dedupes on `(meta.prompt_id, meta.run_id)`.

### R2 — Gate Targeting
- Orchestrator sets `meta.gate_target`.
- Prompt outputs `prompt_result.gate_result.gate_id == meta.gate_target`.
- If `gate_target == "N/A"`, prompt outputs `gate_result.status: na`.

### R3 — Token Hygiene
- `context_block` is **summary-only**.
- Large artifacts go to APPENDICES (`appendices_index`).

### R4 — Contract Freeze Authority
- Only `APP/04_data-api-contract` may create/update contract freeze + OpenAPI.
- FE/BE must pin to a freeze label.

---

## 2) PPS v1.2 — Standard Input Envelope

```yaml
pps_version: "1.2"

meta:
  prompt_id: "APP/00_placeholder"
  prompt_version: "1.2"
  iteration_id: "2026-01-28T00:00:00-06:00"   # batch marker
  run_id: "RUN-000001"                        # unique per execution
  depth_mode: "MVP"                           # MVP | Full | Blueprint
  stack_prefs: []
  output_mode: "delta"                        # delta | full
  output_format: "prompt_result_v1.2"         # strict output shape
  gate_target: "N/A"                          # or one of GATE_* ids
  token_hygiene:
    context_block_policy: "summary_only"
    large_artifact_policy: "appendix_only"
    appendix_threshold_chars: 4000

constraints:
  team_size: ""
  timeline: ""
  budget: ""
  compliance_privacy: ""
  hosting_limits: ""

project:
  name: ""
  brief: ""
  domain: ""
  users: ""

context_block: |-
  (PROJECT_CONTEXT_BLOCK summary)

appendices_index:
  - id: "A1_openapi.yaml"
    kind: "openapi"
    summary: ""
    location: ""
    produced_by: ""
    updated_on: "2026-01-28"

state:
  decision_log: []
  open_questions: []
  changelog: []
  change_requests: []
  contract_freeze_ref:
    label: ""                 # e.g., "v0"
    openapi_appendix_id: ""   # e.g., "A1_openapi.yaml"
    updated_on: ""            # e.g., "2026-01-28"

focus: {}
```

---

## 3) Shared object schemas v1.2

### DecisionLogEntry
```yaml
decision_log_entry:
  id: "D-001"                 # optional
  date: "2026-01-28"
  decision: ""
  rationale: ""
  impact: ""
  owner: ""
```

### OpenQuestionEntry
```yaml
open_question_entry:
  id: "Q-001"
  question: ""
  context: ""
  options:
    - ""
    - ""
  recommended: ""
  owner: ""
  due_by: ""
```

### ChangeLogEntry
```yaml
changelog_entry:
  date: "2026-01-28"
  changed_area: ""            # MVP_SCOPE | API_CONTRACT | ARCH_DECISIONS | DATA_MODEL | etc.
  change: ""
  reason: ""
  compatibility: ""           # patch | minor | major
  impact: ""
```

### AppendixRef
```yaml
appendix_ref:
  id: "A1_openapi.yaml"
  kind: "openapi"             # openapi | migrations | ui_catalog | ci_yaml | other
  summary: ""
  location: ""
  produced_by: ""             # e.g., "APP/04_data-api-contract"
  updated_on: "2026-01-28"
```

### ChangeRequest
```yaml
change_request:
  id: "CR-001"
  area: "API_CONTRACT"        # API_CONTRACT | DATA_MODEL | UX | ARCH | NFR
  requested_by: "APP/05_frontend-plan"
  depends_on_freeze_label: "v0"
  description: ""
  reason: ""
  proposed_change: ""
  compatibility: "minor"      # patch | minor | major
  status: "open"              # open | accepted | rejected
```

---

## 4) PromptResult v1.2 — Standard Output Patch

```yaml
prompt_result:
  meta:
    prompt_id: ""
    prompt_version: "1.2"
    iteration_id: ""
    run_id: ""
    applied_to_freeze_label: ""   # required for FE/BE

  context_updates: {}              # delta only; summary only

  appendices_updates:
    added: []                      # list of appendix_ref
    updated: []                    # list of appendix_ref

  state_updates:
    decision_log_added: []         # list of decision_log_entry
    open_questions_added: []       # list of open_question_entry
    changelog_added: []            # list of changelog_entry
    change_requests_added: []      # list of change_request

  gate_result:
    gate_id: ""
    status: "pass"                 # pass | fail | na
    reason: ""
    blockers: []
    next_actions: []

  warnings: []
```

---

## 5) Gates v1.2

### Gate IDs
- `GATE_1_MVP_BOUNDED`
- `GATE_2_TRACEABILITY_FLOW_SCREEN_STATE`
- `GATE_3_TRUST_AND_CLASSIFICATION`
- `GATE_4_CONTRACT_FREEZE_V0`
- `GATE_5_CONTRACT_NO_DEVIATIONS`
- `GATE_6_INTEGRATIONS_HARDENED`
- `GATE_7_STAGING_REHEARSAL_AND_SLO_ALERTS`

### Gate ownership
```yaml
gate_ownership:
  GATE_1_MVP_BOUNDED: "APP/01_mvp-cutter"
  GATE_2_TRACEABILITY_FLOW_SCREEN_STATE: "APP/02_ux-flows"
  GATE_3_TRUST_AND_CLASSIFICATION: "APP/03_architecture"
  GATE_4_CONTRACT_FREEZE_V0: "APP/04_data-api-contract"
  GATE_5_CONTRACT_NO_DEVIATIONS: "APP/05_frontend-plan"
  GATE_6_INTEGRATIONS_HARDENED: "APP/07_integrations-async-security"
  GATE_7_STAGING_REHEARSAL_AND_SLO_ALERTS: "APP/08_release-ops"
```

---

## 6) Contract Freeze + Change Request handshake (CF rules)

### CF-1 — Freeze creation (APP/04 only)
`APP/04_data-api-contract` must set:
- `state.contract_freeze_ref.label` (e.g., `v0`, then `v0.1` / `v1`)
- `state.contract_freeze_ref.openapi_appendix_id` (e.g., `A1_openapi.yaml`)
- `state.contract_freeze_ref.updated_on` (today)

### CF-2 — Freeze declaration (FE/BE)
`APP/05_frontend-plan` and `APP/06_backend-plan` must:
- receive `focus.contract_freeze_label`
- output `prompt_result.meta.applied_to_freeze_label == focus.contract_freeze_label`

### CF-3 — Deviations become ChangeRequests
Any missing endpoint/entity/field needed by FE/BE becomes a ChangeRequest with:
- `depends_on_freeze_label == applied_to_freeze_label`

### CF-4 — Applying ChangeRequests (APP/04 only)
Only `APP/04_data-api-contract` can accept CRs and emit:
- new freeze label
- updated OpenAPI appendix ref
- `changelog_entry` with `compatibility` (patch/minor/major)

---

## 7) Prompt focus schemas (#1–#8) v1.2

### #1 — APP/01_mvp-cutter (Gate: GATE_1_MVP_BOUNDED)
```yaml
focus:
  project_brief: |-
    (required) short + concrete description of the idea

  constraints_override:           # optional
    team_size: ""
    timeline: ""
    budget: ""
    compliance_privacy: ""

  existing_context_summary: |-
    (optional) if iterating
```

### #2 — APP/02_ux-flows (Gate: GATE_2_TRACEABILITY_FLOW_SCREEN_STATE)
```yaml
focus:
  mvp_scope:
    in_scope: []
    out_of_scope: []
    acceptance_criteria: []
    success_metrics: []

  constraints_notes: ""          # optional

  ux_assumptions:
    primary_user_roles: []
    primary_platform: ""
```

### #3 — APP/03_architecture (Gate: GATE_3_TRUST_AND_CLASSIFICATION)
```yaml
focus:
  mvp_scope_summary: ""
  key_user_flows_summary: ""

  stack_prefs_override: []       # optional

  nfr_targets_seed:
    latency_p95_ms: null
    availability_slo: ""
    error_rate_target: ""
    frontend_perf_budget: ""
    a11y_target: ""
    rate_limits_seed: ""

  critical_endpoint_candidate: ""
```

### #4 — APP/04_data-api-contract (Gate: GATE_4_CONTRACT_FREEZE_V0)
```yaml
focus:
  existing_contract_freeze_label: ""   # optional

  user_flows:
    - name: ""
      description: ""
      screens_involved: []
      primary_actions: []

  screens:
    - route: ""
      purpose: ""
      permissions: []
      states: ["loading", "empty", "error"]

  arch_decisions_summary: ""
  nfr_targets:
    latency_p95_ms: null
    availability_slo: ""
    error_rate_target: ""
    rate_limits_targets: ""

  contract_freeze_policy:
    versioning_scheme: "semver"
    freeze_label: "v0"
    compatibility_rules_required: true
```

### #5 — APP/05_frontend-plan (Gate: GATE_5_CONTRACT_NO_DEVIATIONS)
```yaml
focus:
  contract_freeze_label: "v0"        # required

  screens:
    - route: ""
      purpose: ""
      permissions: []
      states: ["loading", "empty", "error"]

  api_contract_ref:
    appendix_id: "A1_openapi.yaml"
    summary: ""

  canonical_vocab:
    entities: []
    events: []
    endpoint_rules: ""

  nfrs:
    frontend_perf_budget: ""
    a11y_target: ""
```

### #6 — APP/06_backend-plan (Gate: usually N/A)
```yaml
focus:
  contract_freeze_label: "v0"        # required

  data_model_ref:
    appendix_id: "A2_migrations.sql"
    summary: ""

  api_contract_ref:
    appendix_id: "A1_openapi.yaml"
    summary: ""

  trust_boundaries_summary: ""
  data_classification_summary: ""

  nfr_targets:
    latency_p95_ms: null
    availability_slo: ""
    error_rate_target: ""

  observability_standards_seed:
    trace_header: "traceparent"
    log_format: "json"
    metrics_namespace: ""
```

### #7 — APP/07_integrations-async-security (Gate: GATE_6_INTEGRATIONS_HARDENED)
```yaml
focus:
  integrations:
    - name: ""
      purpose: ""
      direction: "outbound"          # outbound | inbound
      auth_method: ""                # api key | oauth | webhook secret | etc.
      criticality: "medium"          # low | medium | high

  endpoints_summary: ""

  jobs_seed:
    - name: ""
      trigger: ""
      why_async: ""

  data_retention_seed:
    pii_retention_days: null
    deletion_sla_days: null

  rate_limit_seed:
    per_user_rpm: null
    per_ip_rpm: null
```

### #8 — APP/08_release-ops (Gate: GATE_7_STAGING_REHEARSAL_AND_SLO_ALERTS)
```yaml
focus:
  nfr_targets:
    availability_slo: ""
    latency_p95_ms: null
    error_rate_target: ""

  observability_hooks_summary: ""
  contract_freeze_summary: ""

  migration_plan_ref:
    appendix_id: "A2_migrations.sql"
    summary: ""

  environments_seed: ["dev", "preview", "stage", "prod"]

  ci_preferences:
    provider: ""
    required_checks: ["lint", "typecheck", "unit", "integration", "e2e_smoke"]
```

---

## 8) OMS v1.0 — Orchestrator Merge Algorithm Spec

### 8.1 Dedupe
- Key: `(meta.prompt_id, meta.run_id)`
- If already applied: no-op.

### 8.2 Patch application order (atomic)
1) Validate shape (`output_format`)
2) Validate gate semantics
3) Validate freeze pinning (if required)
4) Apply `context_updates`
5) Apply `appendices_updates`
6) Apply `state_updates`
7) Run consistency checks
8) Commit applied index entry

### 8.3 Context merge rules (`context_updates`)
- Objects/maps: deep merge, leaf overwrite
- Arrays: replace entire array unless section is append-only
- Scalars: overwrite
- Append-only sections: `DECISION_LOG`, `OPEN_QUESTIONS`, `CHANGELOG`
- Token hygiene enforcement: reject (or require appendix) if any value exceeds threshold.

### 8.4 Appendices merge rules
- `added`: id must not exist
- `updated`: id must exist
- Maintain stable ordering policy (by id or insertion order; pick and lock).

### 8.5 Contract freeze enforcement
- Only `APP/04_data-api-contract` may change contract freeze or contract-defining artifacts.
- FE/BE prompts must:
  - receive `focus.contract_freeze_label`
  - emit `applied_to_freeze_label`
  - match current `state.contract_freeze_ref.label`

### 8.6 Change request lifecycle
- Append-only CR creation.
- Allowed transitions: `open → accepted`, `open → rejected`.
- Only APP/04 can accept/reject and emit new freeze + changelog.

### 8.7 Gate enforcement
- If `gate_target == "N/A"` → require `status: na`.
- Else require `gate_id == gate_target` and status pass/fail.
- Fail blocks subsequent prompts unless explicitly overridden.

### 8.8 Post-merge consistency checks (minimum)
- Traceability: MVP features map to flows + screens.
- Contract coherence: freeze OpenAPI appendix exists.
- NFR presence: after architecture, NFR targets exist (even rough).

### 8.9 Iteration summary (required)
At end of iteration, orchestrator outputs:
- decisions made
- open questions
- changelog entries
- active freeze label
- gates passed/failed
- next actions

---

## 9) Canonical status
- PPS v1.2: FROZEN
- OMS v1.0: FROZEN
- Contract freeze handshake: enforceable
- Parallel FE/BE correctness: enforceable
- Automation readiness: yes

