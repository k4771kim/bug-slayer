# Session 8 Handoff Document

## Session Summary
**Date**: 2026-02-08
**Duration**: ~2 hours
**Focus**: Railway deployment fix (Task 1 from SESSION7_NEXT.md)

---

## Completed Tasks

### Task 1: Railway Deployment Fix (CRITICAL) - COMPLETED
**Problem**: Railway backend returned 500 on all API calls (P2021: table does not exist)

**Root Cause**: `prisma db push` was not running at container startup. Railway's Nixpacks auto-generated Dockerfile ignored `railway.toml` startCommand and ran `node dist/index.js` directly without initializing the SQLite database.

**Solution**:
1. Created custom `Dockerfile` with multi-stage build (deps → builder → runner)
2. CMD: `["sh", "-c", "npx prisma db push --accept-data-loss && node dist/index.js"]`
3. Removed `railway.toml` (was overriding Dockerfile CMD with `cd apps/server && pnpm start` causing `cd: not found` error)
4. Set Railway service config: `dockerfilePath: "Dockerfile"`, cleared `railwayConfigFile` and `startCommand`
5. Updated `pnpm-lock.yaml` to fix frozen-lockfile mismatch

**Key commits** (on master):
- `6410926` - Remove DATABASE_URL override in start script
- `033ff0b` - Add custom Dockerfile
- `68cdebc` - Use `sh -c` in CMD
- `7abbcb5` - Remove railway.toml
- `263dfbe` - Update pnpm-lock.yaml
- `2ae4a3e` - Update deployment docs

**Verification**: `POST /api/auth/register` returns 201 with user data

### Task 2: P2002 Error Handler (HIGH) - COMPLETED (Session 7)
- `errorHandler.ts`: `instanceof Prisma.PrismaClientKnownRequestError` for P2002 → 409
- Added `EMAIL_ALREADY_EXISTS` message handler → 409
- Added SyntaxError/JSON parse error handler → 400

### Task 3: E2E Tests (MEDIUM) - COMPLETED (Session 7)
- Playwright tests rewritten to match actual frontend
- Result: 6 pass, 20 skip (Phaser canvas), 0 fail

### Documentation Updates
- `DEPLOY_GUIDE.md`: Complete rewrite with current Vercel+Railway setup
- `phase2-tech-improvement.design.md`: Fixed DATABASE_URL from MongoDB to SQLite
- `phase2-tech-improvement.plan.md`: Fixed DATABASE_URL description

---

## Current Architecture

### Deployment
| Service | Platform | URL | Auto-Deploy |
|---------|----------|-----|-------------|
| Frontend | Vercel | https://out-tau-jade.vercel.app | Yes (master push) |
| Backend | Railway | https://bug-slayer-api-production.up.railway.app | Yes (GitHub webhook) |

### Railway Configuration
- **Builder**: RAILPACK (auto-detects Dockerfile)
- **Dockerfile**: `/Dockerfile` (multi-stage: deps → builder → runner)
- **CMD**: `sh -c "npx prisma db push --accept-data-loss && node dist/index.js"`
- **Database**: SQLite (`file:./prod.db`) - ephemeral, resets on redeploy
- **Healthcheck**: `/health`

### Railway Environment Variables
```
DATABASE_URL=file:./prod.db
JWT_SECRET=BugSlayer2026SuperSecretKeyForJWTAuth
CORS_ORIGIN=https://out-tau-jade.vercel.app
```

### Railway API Access
- Token 1: `3b830fec-c8a6-480c-b5ed-26cec7941de0` (works for mutations)
- Token 2: `e6838f59-24b9-4f68-9ffd-78e2d3053816` (works for queries)
- Project ID: `68e988cf-a23b-4091-8009-be5b18489911`
- Service ID: `84edba1f-19a9-497a-9e5a-bd46d92b0ced`
- Environment ID: `6f5b030a-c385-4264-bdc2-416eaebab269`
- Deploy Trigger ID: `48c76ffc-5bd4-40fd-8cbc-5b5cdb5b36f7`

### Test Account
- Email: `success@example.com`
- Password: `TestPass12345`
- DisplayName: Success User

---

## Known Issues / Gotchas

1. **Railway SQLite is ephemeral**: Data resets on every deploy. For persistent data, need to migrate to PostgreSQL or use Railway volumes.
2. **Railway API quirks**:
   - `githubRepoDeploy` returns an ID but deployment doesn't actually appear
   - `deploymentRedeploy` reuses the previous Docker image (no new build)
   - `serviceInstanceUpdate` settings may revert - always verify after setting
3. **railway.toml overrides Dockerfile CMD**: Never use railway.toml startCommand with a custom Dockerfile
4. **pnpm-lock.yaml must stay in sync**: Railway uses `--frozen-lockfile`, any package.json change requires lockfile update
5. **Chat API**: Long Korean messages with special chars cause Bad Request. Keep messages shorter.

---

## Remaining Work (Task 4 from SESSION7_NEXT.md)

### Phase 2 Content Planning (LOW priority)
- Reference: `docs/01-plan/features/phase2-content.plan.md`
- Scope: 4 classes, 2 chapters, 1 minigame, 2 endings (per meeting decisions)
- Status: NOT STARTED

### Other Future Work
- Migrate SQLite → PostgreSQL for persistent data on Railway
- Fix GitHub Pages deployment (currently using Vercel)
- Add CI/CD pipeline (tests before deploy)
- Phase 2 content implementation

---

## Git Status
- Branch: `master`
- Latest commit: `2ae4a3e` (docs update)
- All changes pushed to origin
- Untracked files: various `.omc/sessions/`, test-results/, etc. (not committed)
