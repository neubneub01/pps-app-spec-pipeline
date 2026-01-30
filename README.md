# PPS v1.2 App Spec Pipeline — Canonical System

Contract-first, gate-driven spec pipeline for building apps with repeatable, automation-ready inputs/outputs.

- **Input:** PPS v1.2 (single envelope for all prompts)
- **Output:** PromptResult v1.2 (delta patch)
- **Gates:** 7 standard gates
- **Orchestrator:** OMS v1.0 merge algorithm (deterministic application)

## Normative rules (R0–R4)

- **R0** — Every run uses PPS v1.2; every prompt outputs `output_format: prompt_result_v1.2`.
- **R1** — `meta.run_id` unique per execution; orchestrator dedupes on `(meta.prompt_id, meta.run_id)`.
- **R2** — Orchestrator sets `meta.gate_target`; prompt outputs `gate_result.gate_id == gate_target` (or `status: na` when `gate_target == "N/A"`).
- **R3** — `context_block` is summary-only; large artifacts go to appendices.
- **R4** — Only `APP/04_data-api-contract` may create/update contract freeze + OpenAPI; FE/BE pin to a freeze label.

## Project layout

```
src/
  schemas/       # PPS v1.2, PromptResult v1.2, shared object types
  gates.ts       # Gate IDs and ownership
  orchestrator/  # OMS v1.0 merge algorithm
  validate.ts    # PPS & result validation
  io.ts          # YAML load/save; state load/save (JSON)
  stubs.ts       # Stub PromptResult for APP/01–08 (demos, tests)
  cli.ts         # CLI (validate, merge)
  demo.ts        # Demo pipeline run (APP/01 -> APP/02)
  index.ts       # Public API
templates/       # Example PPS envelope & PromptResult YAML
pps_v_1.md       # Full spec (plan)
```

## Quick Start (Automated)

Run the full pipeline with one command:

```bash
npm install
npm run build

# Set your Anthropic API key
export ANTHROPIC_API_KEY="sk-ant-..."

# Run the pipeline
pps run --brief "A todo app where users can sign up, log in, and manage their personal todo lists" --api-key "$ANTHROPIC_API_KEY"
```

This will:
1. Call Claude API 8 times (APP/01 → APP/08)
2. Merge each result automatically
3. Export artifacts to `./spec/`:
   - `openapi.yaml` (API contract)
   - `migrations.sql` (database schema)
   - `decisions.md` (decision log)
   - `CHANGELOG.md` (changes)
   - `state.json` (full pipeline state)

## Usage

### Automated Pipeline (CLI)

```bash
pps run --brief "your project idea" --api-key "sk-ant-..." [options]

Options:
  --name <name>       Project name (default: from brief)
  --domain <domain>   Domain (default: general)
  --team <size>       Team size (default: 2)
  --timeline <time>   Timeline (default: 8 weeks)
  --budget <budget>   Budget (default: startup)
  --output <dir>      Output directory (default: ./spec)
  --model <model>     Claude model (default: claude-3-5-sonnet-20241022)
```

### Manual Pipeline (Programmatic)

#### Validate envelope or result

```ts
import { validatePPSEnvelope, validatePromptResult } from "pps-app-spec-pipeline";

const v1 = validatePPSEnvelope(envelope);
const v2 = validatePromptResult(result);
```

### Merge a PromptResult into pipeline state (OMS)

```ts
import { merge } from "pps-app-spec-pipeline";

const out = merge({
  envelope,           // PPS v1.2 envelope
  result,             // PromptResult v1.2
  applied_index: [],  // optional; for dedupe
});

if (out.ok) {
  console.log(out.state);
  console.log(out.iteration_summary);
} else {
  console.error(out.errors);
}
```

### Load from YAML / state

```ts
import { loadEnvelope, loadPromptResult, loadState, saveState } from "pps-app-spec-pipeline";

const { envelope, validation } = loadEnvelope("path/to/pps.yaml");
const { result, validation: v2 } = loadPromptResult("path/to/result.yaml");
const state = loadState("path/to/state.json");
saveState("path/to/state.json", state);
```

### Build next envelope from pipeline state

```ts
import { envelopeFromState } from "pps-app-spec-pipeline";

const nextEnvelope = envelopeFromState(baseEnvelope, pipelineState, {
  prompt_id: "APP/02_ux-flows",
  run_id: "RUN-000002",
  gate_target: "GATE_2_TRACEABILITY_FLOW_SCREEN_STATE",
}, focus);
```

### Stub results (demos / tests)

```ts
import { stubResult } from "pps-app-spec-pipeline";

const result = stubResult({
  prompt_id: "APP/01_mvp-cutter",
  run_id: "RUN-001",
  gate_target: "GATE_1_MVP_BOUNDED",
  status: "pass",
});
```

## CLI

After `npm run build`, run via `node dist/cli.js` or `npx pps-app-spec-pipeline`:

```bash
# Validate envelope or result
node dist/cli.js validate envelope path/to/pps.yaml
node dist/cli.js validate result path/to/result.yaml

# Merge result into pipeline state (optional state in/out)
node dist/cli.js merge path/to/envelope.yaml path/to/result.yaml
node dist/cli.js merge envelope.yaml result.yaml --state-in state.json --state-out state.json
```

## Gates

| Gate | Owner |
|------|--------|
| GATE_1_MVP_BOUNDED | APP/01_mvp-cutter |
| GATE_2_TRACEABILITY_FLOW_SCREEN_STATE | APP/02_ux-flows |
| GATE_3_TRUST_AND_CLASSIFICATION | APP/03_architecture |
| GATE_4_CONTRACT_FREEZE_V0 | APP/04_data-api-contract |
| GATE_5_CONTRACT_NO_DEVIATIONS | APP/05_frontend-plan |
| GATE_6_INTEGRATIONS_HARDENED | APP/07_integrations-async-security |
| GATE_7_STAGING_REHEARSAL_AND_SLO_ALERTS | APP/08_release-ops |

## Scripts

```bash
npm install        # Install dependencies
npm run build      # Compile TypeScript
npm run test       # Run Jest tests
npm run demo       # Run demo pipeline (APP/01 -> APP/02 with stubs)
npm run lint       # Type-check without emitting files

# After build, use the CLI:
pps validate envelope <path>    # Validate PPS envelope
pps validate result <path>      # Validate PromptResult
pps merge <env> <result>        # Merge result into state
pps run --brief "..." --api-key "..."  # Run full automated pipeline
```

## Spec reference

See `pps_v_1.md` for the full PPS v1.2 and OMS v1.0 spec (envelope, PromptResult, shared schemas, gates, CF rules, focus schemas, merge algorithm).
