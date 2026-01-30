# PPS Pipeline Guide — What This Is and How to Use It

## What is this?

This is a **contract-first spec pipeline** for building app specifications. Instead of asking an LLM "build me an app" and getting vague output, this system:

1. **Breaks app spec creation into 8 focused steps** (prompts)
2. **Validates each step** with gates (quality checkpoints)
3. **Merges outputs** into a single, evolving spec
4. **Produces structured artifacts**: OpenAPI spec, database migrations, component trees, decision logs

**Think of it as an assembly line for creating app specs**, not the apps themselves.

---

## The Big Picture

```
Your Idea ("todo app with auth")
    ↓
[APP/01: Define MVP scope] → merge → state.json
    ↓
[APP/02: Define UX flows] → merge → state.json (updated)
    ↓
[APP/03: Pick tech stack] → merge → state.json (updated)
    ↓
[APP/04: Create API contract (OpenAPI)] → merge → state.json + openapi.yaml (FROZEN)
    ↓
[APP/05: Frontend plan] → merge → state.json (uses frozen API)
    ↓
[APP/06: Backend plan] → merge → state.json + migrations.sql
    ↓
[APP/07: Integrations] → merge → state.json
    ↓
[APP/08: Ops/CI/CD] → merge → state.json
    ↓
Final Output: Complete spec (OpenAPI, migrations, decisions, etc.)
```

---

## Why 8 prompts instead of 1?

| Problem with 1 prompt | Solution with 8 prompts |
|----------------------|------------------------|
| Vague, incomplete output | Each prompt has a specific job |
| No validation | 7 gates ensure quality |
| Hard to iterate | Change scope at APP/01, re-run from there |
| Frontend/backend drift | APP/04 freezes API contract |
| No traceability | Decision log tracks every choice |

---

## The 8 Prompts (What Each Does)

### APP/01: MVP Cutter (Gate 1)
**Job:** Define what's in/out of scope for MVP.

**Input:** Your project brief ("todo app with auth")

**Output:**
- In-scope features: signup, login, CRUD todos, mark complete
- Out-of-scope: sharing, teams, mobile app
- Acceptance criteria: "Users can sign up with email/password"

**Gate:** GATE_1_MVP_BOUNDED (scope is clear and bounded)

---

### APP/02: UX Flows (Gate 2)
**Job:** Map user flows and screens.

**Input:** MVP scope from APP/01

**Output:**
- User flows: signup flow, todo CRUD flow
- Screens: `/login`, `/signup`, `/todos`
- States: loading, empty, error

**Gate:** GATE_2_TRACEABILITY_FLOW_SCREEN_STATE (flows map to screens)

---

### APP/03: Architecture (Gate 3)
**Job:** Pick tech stack and define NFRs (non-functional requirements).

**Input:** UX flows from APP/02

**Output:**
- Stack: React + Node + Postgres
- NFRs: <200ms p95 latency, 99.9% uptime
- Trust boundaries: auth middleware, input validation

**Gate:** GATE_3_TRUST_AND_CLASSIFICATION (security/trust defined)

---

### APP/04: API Contract (Gate 4) — **THE CRITICAL ONE**
**Job:** Create OpenAPI spec and **freeze it**.

**Input:** Stack + flows from APP/02-03

**Output:**
- **OpenAPI spec** (saved as `openapi.yaml`)
- Endpoints: `POST /api/auth/signup`, `GET /api/todos`, etc.
- **Contract freeze label** (e.g. `v0`)

**Gate:** GATE_4_CONTRACT_FREEZE_V0 (contract is frozen)

**Why this matters:** Frontend (APP/05) and backend (APP/06) both use this frozen contract. No drift.

---

### APP/05: Frontend Plan (Gate 5)
**Job:** Define component tree and state management.

**Input:** Frozen API contract from APP/04

**Output:**
- Component tree: `<App> → <TodoList> → <TodoItem>`
- State management: React Context or Zustand
- API client (generated from OpenAPI)

**Gate:** GATE_5_CONTRACT_NO_DEVIATIONS (frontend matches frozen API)

---

### APP/06: Backend Plan (Gate 6)
**Job:** Define data model and migrations.

**Input:** Frozen API contract from APP/04

**Output:**
- Database schema: `users`, `todos` tables
- **Migrations** (saved as `migrations.sql`)
- Observability: logging, tracing

**Gate:** Usually N/A (no specific gate for backend)

---

### APP/07: Integrations (Gate 7)
**Job:** Define external services and async jobs.

**Input:** API + data model from APP/04-06

**Output:**
- Integrations: email service (SendGrid), webhooks
- Async jobs: email verification, cleanup tasks
- Security: API key management, rate limiting

**Gate:** GATE_6_INTEGRATIONS_HARDENED (integrations secured)

---

### APP/08: Release Ops (Gate 8)
**Job:** Define CI/CD, monitoring, and SLOs.

**Input:** Full spec from APP/01-07

**Output:**
- CI/CD config: GitHub Actions, tests, deploy
- Monitoring: Datadog, error alerts
- SLOs: 99.9% uptime, <200ms latency

**Gate:** GATE_7_STAGING_REHEARSAL_AND_SLO_ALERTS (ops ready)

---

## What You End Up With

After running all 8 prompts + merges, you have:

### 1. **OpenAPI Spec** (`openapi.yaml`)
```yaml
openapi: 3.0.0
paths:
  /api/auth/signup:
    post:
      requestBody: { email, password }
      responses: { 201: { userId, token } }
  /api/todos:
    get: ...
    post: ...
```

Use this to:
- Generate TypeScript types: `openapi-generator`
- Generate API client
- Document your API

### 2. **Database Migrations** (`migrations.sql`)
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL
);

CREATE TABLE todos (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  completed BOOLEAN DEFAULT FALSE
);
```

Run: `psql < migrations.sql`

### 3. **Decision Log** (in `state.json`)
```json
{
  "decision_log": [
    {
      "date": "2026-01-30",
      "decision": "Use email/password auth (no OAuth for MVP)",
      "rationale": "Simplest to implement; OAuth can be added later",
      "impact": "Users need email; no social login"
    }
  ]
}
```

### 4. **Component Tree** (in `state.json`)
```
<App>
  <AuthProvider>
    <Router>
      <LoginPage />
      <SignupPage />
      <TodosPage>
        <TodoList>
          <TodoItem />
        </TodoList>
      </TodosPage>
    </Router>
  </AuthProvider>
</App>
```

### 5. **Changelog** (in `state.json`)
Tracks what changed between iterations (e.g. "Added rate limiting to API").

---

## How to Use It

### ✅ Automated (Recommended)

**This is now built and ready to use!**

```bash
# 1. Install and build
npm install
npm run build

# 2. Get your Anthropic API key from https://console.anthropic.com/

# 3. Run the pipeline
pps run --brief "A todo app where users can sign up, log in, and manage their personal todo lists" --api-key "sk-ant-..."

# 4. Check the output in ./spec/
ls spec/
# openapi.yaml, migrations.sql, decisions.md, CHANGELOG.md, state.json
```

**What happens:**
1. Calls Claude API 8 times (APP/01 → APP/08)
2. Merges each result automatically
3. Exports artifacts to `./spec/`

**Cost:** ~$0.50-$2 per full run (depending on project complexity)

**Options:**
```bash
pps run --brief "..." --api-key "..." \
  --name "My App" \
  --domain "e-commerce" \
  --team 3 \
  --timeline "12 weeks" \
  --budget "funded" \
  --output "./my-spec" \
  --model "claude-3-5-sonnet-20241022"
```

---

### Manual (Advanced)

If you want full control over each step:

#### Step 1: Fill in project brief
Edit `templates/pps-envelope.example.yaml`:
```yaml
project:
  name: "Todo App"
  brief: "A todo app where users can sign up, log in, and manage their personal todo lists"
```

#### Step 2: Send to LLM (Claude/ChatGPT)
Copy/paste the envelope + APP/01 prompt to Claude:
```
You are APP/01 (mvp-cutter). Given this project:

[paste envelope here]

Your job: Define MVP scope (in-scope, out-of-scope, acceptance criteria).

Output format: PromptResult v1.2 (YAML).
```

#### Step 3: Save LLM response
Save Claude's response as `result-01.yaml`.

#### Step 4: Merge
```bash
node dist/cli.js merge envelope.yaml result-01.yaml --state-out state.json
```

#### Step 5: Build next envelope
Use `envelopeFromState` to build envelope for APP/02 (see README for code example).

#### Step 6: Repeat for APP/02 → APP/08
Repeat steps 2-5 for each prompt.

---

## What This Does NOT Do

This pipeline **does not**:
- ❌ Write code for you (no React components, no backend routes)
- ❌ Deploy anything
- ❌ Call LLMs automatically (you have to wire that)

It **produces a spec**. You still need to:
- Write the code (or use generators like `openapi-generator`)
- Set up the database (`psql < migrations.sql`)
- Deploy (`docker`, `vercel`, etc.)

---

## Quick Start (Try the Demo)

Run the demo to see the pipeline in action (with stub results, no LLM):

```bash
npm install
npm run build
npm run demo
```

This simulates:
1. APP/01 (MVP cutter) → merge → saves state
2. APP/02 (UX flows) → merge → updates state

Check `.demo-state.json` to see the merged state.

---

## File Structure

```
src/
  schemas/       # PPS v1.2, PromptResult v1.2, shared types
  gates.ts       # 7 gate IDs and ownership
  orchestrator/  # OMS v1.0 merge algorithm
  validate.ts    # Validation for envelope/result
  io.ts          # Load/save YAML and state (JSON)
  stubs.ts       # Stub results for demos/tests
  cli.ts         # CLI (validate, merge)
  demo.ts        # Demo pipeline (APP/01 → APP/02)
  index.ts       # Public API

templates/       # Example envelope and result YAML
pps_v_1.md       # Full spec (normative rules, schemas, gates)
```

---

## Key Concepts

### 1. **Envelope** (PPS v1.2)
The **input** to a prompt. Contains:
- `meta` (prompt_id, run_id, gate_target)
- `project` (name, brief, domain)
- `constraints` (team size, timeline, budget)
- `context_block` (summary of current state)
- `state` (decision_log, changelog, contract_freeze_ref)
- `focus` (specific inputs for this prompt)

### 2. **PromptResult** (v1.2)
The **output** from a prompt. Contains:
- `meta` (prompt_id, run_id)
- `context_updates` (delta to merge into context)
- `appendices_updates` (add/update artifacts like OpenAPI)
- `state_updates` (decision_log_added, changelog_added, etc.)
- `gate_result` (gate_id, status: pass/fail/na)

### 3. **Merge** (OMS v1.0)
The **orchestrator** that:
- Takes envelope + result
- Validates (shape, gate, freeze pinning)
- Applies updates (context, appendices, state)
- Dedupes (tracks applied_index)
- Returns new state

### 4. **Contract Freeze**
After APP/04, the API contract is **frozen** (labeled `v0`). Frontend (APP/05) and backend (APP/06) must use this frozen contract. Any changes require a **Change Request** (CR) that APP/04 accepts/rejects.

### 5. **Gates**
7 quality checkpoints:
1. MVP_BOUNDED (scope is clear)
2. TRACEABILITY_FLOW_SCREEN_STATE (flows map to screens)
3. TRUST_AND_CLASSIFICATION (security defined)
4. CONTRACT_FREEZE_V0 (API frozen)
5. CONTRACT_NO_DEVIATIONS (frontend matches API)
6. INTEGRATIONS_HARDENED (integrations secured)
7. STAGING_REHEARSAL_AND_SLO_ALERTS (ops ready)

---

## Next Steps

### To use (automated):
```bash
# 1. Install
npm install && npm run build

# 2. Get API key from https://console.anthropic.com/

# 3. Run
pps run --brief "your project idea" --api-key "sk-ant-..."

# 4. Review output
ls spec/
cat spec/openapi.yaml
cat spec/migrations.sql
cat spec/decisions.md
```

### To use (manual):
1. Fill in `templates/pps-envelope.example.yaml` with your project brief
2. Send to Claude/ChatGPT with APP/01 prompt (see `prompts/APP_01_mvp-cutter.txt`)
3. Save response as `result-01.yaml`
4. Run `pps merge envelope.yaml result-01.yaml --state-out state.json`
5. Repeat for APP/02 → APP/08

---

## Questions?

- **"Why not just one prompt?"** → One prompt gives vague output. Eight prompts ensure completeness, validation, and contract freeze.
- **"Does this write code?"** → No. It produces a **spec** (OpenAPI, migrations, decisions). You write code or use generators.
- **"Is it automated?"** → Not yet. You manually run each prompt. Automation layer (LLM API calls) can be added.
- **"What's the contract freeze?"** → APP/04 creates an OpenAPI spec and freezes it. Frontend/backend both use it. No drift.

---

## See Also

- **README.md** — Quick reference (usage, CLI, scripts)
- **pps_v_1.md** — Full spec (normative rules, schemas, gates, merge algorithm)
- **templates/** — Example envelope and result YAML
