# Usage Examples

## Quick Start (Automated)

The fastest way to generate a complete app spec:

```bash
# 1. Install and build
npm install
npm run build

# 2. Run the pipeline with your API key
pps run \
  --brief "A todo app where users can sign up, log in, and manage their personal todo lists" \
  --api-key "sk-ant-your-key-here"

# 3. Check the output
ls spec/
# openapi.yaml, migrations.sql, decisions.md, CHANGELOG.md, state.json
```

## Full Options

```bash
pps run \
  --brief "Your project idea here" \
  --api-key "sk-ant-..." \
  --name "My Awesome App" \
  --domain "e-commerce" \
  --team 3 \
  --timeline "12 weeks" \
  --budget "funded" \
  --output "./my-spec" \
  --model "claude-3-5-sonnet-20241022"
```

## What You Get

After running the pipeline, you'll have:

### 1. OpenAPI Spec (`spec/openapi.yaml`)
Complete API contract with:
- All endpoints (auth, CRUD, etc.)
- Request/response schemas
- Authentication requirements
- Error responses

**Use it to:**
- Generate TypeScript types: `openapi-generator generate -i openapi.yaml -g typescript-axios`
- Generate API client
- Document your API

### 2. Database Migrations (`spec/migrations.sql`)
Complete database schema:
- Tables with columns and types
- Foreign keys and constraints
- Indexes for performance

**Use it to:**
- Set up your database: `psql < migrations.sql`
- Understand data model
- Generate ORM models

### 3. Decision Log (`spec/decisions.md`)
All key decisions made during spec creation:
- Why certain features are in/out of scope
- Tech stack choices
- Architecture decisions
- Trade-offs considered

**Use it to:**
- Understand the "why" behind choices
- Onboard new team members
- Review decisions later

### 4. Changelog (`spec/CHANGELOG.md`)
All changes made during the pipeline run:
- What changed
- Why it changed
- Impact on other areas

### 5. Full State (`spec/state.json`)
Complete pipeline state including:
- All decisions
- All changes
- Contract freeze info
- Applied index (for dedupe)

**Use it to:**
- Continue the pipeline later
- Iterate on the spec
- Programmatic access to all data

## Example Projects

### Todo App
```bash
pps run \
  --brief "A todo app where users can sign up, log in, and manage their personal todo lists. Users can create, edit, delete, and mark todos as complete." \
  --api-key "sk-ant-..."
```

### E-commerce Store
```bash
pps run \
  --brief "An e-commerce store where users can browse products, add them to cart, and checkout. Includes user authentication, product search, and order history." \
  --domain "e-commerce" \
  --team 4 \
  --timeline "16 weeks" \
  --api-key "sk-ant-..."
```

### SaaS Dashboard
```bash
pps run \
  --brief "A SaaS analytics dashboard where users can connect their data sources, create custom reports, and share them with their team. Includes team management and role-based access control." \
  --domain "saas" \
  --team 5 \
  --budget "funded" \
  --api-key "sk-ant-..."
```

## Cost Estimates

- **Simple app** (todo, notes): ~$0.50-$1.00
- **Medium app** (e-commerce, blog): ~$1.00-$1.50
- **Complex app** (SaaS, multi-tenant): ~$1.50-$2.50

Costs depend on:
- Project complexity
- Number of features
- Amount of detail in brief

## Tips for Best Results

### 1. Write a Clear Brief
Good:
```
A todo app where users can sign up with email/password, log in, and manage their personal todo lists. Users can create new todos, edit existing ones, delete them, and mark them as complete. Each todo has a title, optional description, and completion status.
```

Bad:
```
todo app
```

### 2. Specify Domain
Helps the pipeline understand context:
- `e-commerce` → payment, inventory, shipping
- `saas` → multi-tenant, subscriptions, teams
- `social` → feeds, followers, notifications
- `healthcare` → HIPAA, privacy, compliance

### 3. Set Realistic Constraints
- `--team 2` → simpler architecture
- `--team 10` → microservices, more complexity
- `--timeline "8 weeks"` → MVP focus
- `--timeline "6 months"` → more features

### 4. Review and Iterate
After the first run:
1. Review `decisions.md` → check if decisions make sense
2. Review `openapi.yaml` → check if API is complete
3. Review `migrations.sql` → check if data model is correct

If you need changes:
- Update your brief
- Run again (costs another $0.50-$2)
- Or manually edit the outputs

## Manual Mode (Advanced)

If you want full control over each step:

```bash
# 1. Create envelope
# Edit templates/pps-envelope.example.yaml

# 2. Run APP/01 manually
# Copy envelope + prompts/APP_01_mvp-cutter.txt to Claude
# Save response as result-01.yaml

# 3. Merge
pps merge envelope.yaml result-01.yaml --state-out state.json

# 4. Repeat for APP/02-08
# Use envelopeFromState to build next envelope
```

See GUIDE.md for full manual instructions.

## Troubleshooting

### "API key invalid"
- Get your key from https://console.anthropic.com/
- Make sure it starts with `sk-ant-`
- Check you have credits in your account

### "Pipeline failed at APP/04"
- APP/04 creates the API contract (critical step)
- Check if your brief is clear enough
- Try simplifying the scope
- Review the error message for details

### "Output is missing migrations.sql"
- APP/06 creates migrations
- Check if the pipeline completed all 8 steps
- Review `spec/state.json` for errors

### "OpenAPI spec is incomplete"
- Review your brief for missing details
- Check `spec/decisions.md` for what was decided
- Run again with more detail in brief

## Next Steps

After generating your spec:

1. **Review everything**
   - Read `decisions.md`
   - Check `openapi.yaml`
   - Verify `migrations.sql`

2. **Generate code**
   ```bash
   # TypeScript types from OpenAPI
   openapi-generator generate -i spec/openapi.yaml -g typescript-axios -o src/api
   
   # Set up database
   psql < spec/migrations.sql
   ```

3. **Start implementing**
   - Use the OpenAPI spec as your contract
   - Frontend and backend both implement to the spec
   - No drift between FE/BE

4. **Iterate**
   - Need changes? Update brief and re-run
   - Or manually edit the outputs
   - Or use the manual mode for fine control

## Questions?

See:
- **GUIDE.md** → Full explanation of the system
- **README.md** → Technical reference
- **pps_v_1.md** → Complete spec
