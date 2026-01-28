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
  io.ts          # YAML load/save for envelope & result
  index.ts       # Public API
templates/       # Example PPS envelope & PromptResult YAML
pps_v_1.md       # Full spec (plan)
```

## Usage

### Validate envelope or result

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

### Load from YAML

```ts
import { loadEnvelope, loadPromptResult } from "pps-app-spec-pipeline";

const { envelope, validation } = loadEnvelope("path/to/pps.yaml");
const { result, validation: v2 } = loadPromptResult("path/to/result.yaml");
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

- `npm install` — install dependencies (run first)
- `npm run build` — compile TypeScript to `dist/`
- `npm run lint` — `tsc --noEmit`
- `npm run test` — run Jest tests
- `npm run start` — run `dist/index.js`

## Spec reference

See `pps_v_1.md` for the full PPS v1.2 and OMS v1.0 spec (envelope, PromptResult, shared schemas, gates, CF rules, focus schemas, merge algorithm).
