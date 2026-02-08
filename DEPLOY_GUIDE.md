# Bug Slayer Deployment Guide

## Current Active Deployment

| Service | Platform | URL |
|---------|----------|-----|
| Frontend | Vercel | https://out-tau-jade.vercel.app |
| Backend | Railway | https://bug-slayer-api-production.up.railway.app |

- Frontend: Vercel에서 자동 배포 (master 브랜치 push 시)
- Backend: Railway에서 자동 배포 (master 브랜치 push 시, GitHub webhook)

---

## Backend: Railway

### Architecture
- Custom `Dockerfile` 사용 (멀티스테이지 빌드: deps → builder → runner)
- 컨테이너 시작 시 `prisma migrate deploy`로 PostgreSQL 마이그레이션 적용
- PostgreSQL은 Railway managed database로 영구 저장 (재배포해도 데이터 유지)

### Environment Variables (Railway Dashboard)
- `DATABASE_URL`: Railway PostgreSQL 플러그인이 자동 설정 (변경 불필요)
- `JWT_SECRET`: 32자 이상 랜덤 문자열
- `CORS_ORIGIN`: `https://out-tau-jade.vercel.app`
- `PORT`: Railway가 자동 할당 (기본 8080)

### Dockerfile CMD
```dockerfile
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
```

### Healthcheck
- Path: `/health`
- Response: `{"status":"ok","timestamp":"...","environment":"production"}`

### API Endpoints
```
POST /api/auth/register  - 회원가입
POST /api/auth/login     - 로그인
POST /api/auth/logout    - 로그아웃
GET  /api/auth/me        - 현재 사용자 조회
POST /api/game/save      - 게임 저장
GET  /api/game/load      - 게임 로드
DELETE /api/game/save    - 게임 삭제
GET  /health             - 헬스체크
```

---

## Frontend: Vercel

Vercel Dashboard에서 Environment Variables 설정:
- `NEXT_PUBLIC_API_URL`: `https://bug-slayer-api-production.up.railway.app`

> Vercel은 GitHub 연동으로 master 브랜치 push 시 자동 배포됩니다.

---

## Quick Local Test

```bash
# Backend (port 3001)
cd apps/server && pnpm dev

# Frontend (port 3002)
cd apps/web && pnpm dev
```

---

## Troubleshooting

### Railway P2021 (Table does not exist)
- `prisma db push`가 실행되지 않은 경우 발생
- Dockerfile CMD가 올바르게 `prisma db push`를 포함하는지 확인
- `railway.toml`이 Dockerfile CMD를 오버라이드할 수 있으므로 주의

### Railway 자동 배포가 안 되는 경우
- Railway Dashboard에서 Deploy Trigger (GitHub webhook) 확인
- Repository: `k4771kim/bug-slayer`, Branch: `master`
