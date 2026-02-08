# Bug Slayer Deployment Guide

## Current Status
- Frontend (apps/web): Static export build ready at `apps/web/out/`
- Backend (apps/server): Build ready at `apps/server/dist/`
- GitHub Actions workflow: `.github/workflows/deploy-pages.yml`

---

## 1. Frontend: GitHub Pages (Recommended)

### Step 1: Enable GitHub Pages
1. Go to https://github.com/k4771kim/bug-slayer/settings/pages
2. Source: **GitHub Actions**
3. Save

### Step 2: Push changes
```bash
git add .github/workflows/deploy-pages.yml apps/web/next.config.js
git commit -m "feat: add GitHub Pages deployment workflow"
git push origin master
```

### Step 3: Verify
- Actions tab: https://github.com/k4771kim/bug-slayer/actions
- Live URL: **https://k4771kim.github.io/bug-slayer/**

---

## 2. Frontend Alternative: Vercel

```bash
# Get token from https://vercel.com/account/tokens
cd apps/web
npx vercel deploy --prod --yes --token YOUR_TOKEN
```

Environment variables in Vercel Dashboard:
- `NEXT_PUBLIC_API_URL`: Backend URL

> Note: Remove `output: 'export'` from next.config.js for Vercel (SSR mode).

---

## 3. Backend: Railway

```bash
# Get token from Railway dashboard
export RAILWAY_TOKEN=your-token
railway login --browserless
railway up
```

Environment variables:
- `DATABASE_URL`: SQLite file path (e.g., `file:./dev.db`)
- `JWT_SECRET`: Strong random secret
- `CORS_ORIGIN`: Frontend URL (e.g., https://k4771kim.github.io)
- `PORT`: 3001

---

## 4. Backend Alternative: Render.com

1. Go to https://render.com
2. New > Web Service > Connect GitHub repo
3. Root Directory: `apps/server`
4. Build: `npm install && npm run build`
5. Start: `node dist/index.js`
6. Set environment variables (same as Railway)

---

## 5. Backend Alternative: Fly.io

```bash
# Install: curl -L https://fly.io/install.sh | sh
flyctl auth login
cd apps/server
flyctl launch
flyctl deploy
```

---

## After Backend Deployment

Update frontend environment variable:
```bash
# For GitHub Pages - update workflow
# In .github/workflows/deploy-pages.yml, set:
# NEXT_PUBLIC_API_URL: https://your-backend-url.com

# For local .env
echo "NEXT_PUBLIC_API_URL=https://your-backend-url.com" > apps/web/.env.local
```

---

## Quick Local Test

```bash
# Frontend
cd apps/web && npx serve out -s -l 3000

# Backend
cd apps/server && node dist/index.js
```
