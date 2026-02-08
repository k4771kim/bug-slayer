# Phase 2 Tech Improvement Planning Document

> **Summary**: BattleScene refactoring, security improvements, E2E testing, and deployment updates
>
> **Project**: Bug Slayer: The Debugging Dungeon
> **Version**: 0.5.0 (Phase 2)
> **Author**: AI Agent (PM: 루미PM)
> **Date**: 2026-02-08
> **Status**: Draft

---

## 1. Overview

### 1.1 Purpose

Phase 2 Session 4는 기술 부채 해소와 코드 품질 향상을 목표로 합니다:
- **BattleScene.ts 리팩토링**: 2166줄의 거대한 파일을 관심사별 모듈로 분리
- **보안 개선**: JWT → httpOnly cookie 전환, unsafe 타입 정리, 에러 핸들링 강화
- **테스트 보강**: E2E 테스트 시나리오 추가 (Playwright)
- **배포 업데이트**: Vercel/Railway 재배포 및 CORS 검증

### 1.2 Background

**Session 1-3 완료 상태**:
- Session 1 (Polish): EXP 커브, 골드 시스템, 스킬 쿨다운, 아이템 UI, Ch.3-4 몬스터 스프라이트
- Session 2 (Endings): Bad/Secret Ending, 히든 클래스 4종, 클래스 해금 UI
- Session 3 (Minigame + Sound): Deploy Roulette (528줄), SoundManager (442줄, 20 SFX + 2 BGM)

**현재 기술 부채**:
1. BattleScene.ts가 2166줄로 비대화 → 유지보수 어려움
2. JWT 토큰이 localStorage에 노출 → XSS 취약점
3. `any` 타입 남용 → 타입 안정성 저하
4. E2E 테스트 부족 → 회귀 테스트 취약

### 1.3 Related Documents

- GDD: `/home/claude/Claude/ai-gdd/01-gdd/BUG_SLAYER_GDD.md`
- Session 4 Prompt: `/home/claude/Claude/ai-gdd/SESSION4_TECH_IMPROVEMENT.md`
- Phase 2 Roadmap: `/home/claude/Claude/ai-gdd/PHASE2_SESSION_PROMPTS.md`
- Multi-Agent Guide: `/home/claude/Claude/MULTI_ORCHESTRATION.md`

---

## 2. Scope

### 2.1 In Scope

- [x] **Task A**: BattleScene.ts 모듈 분리 (SkillManager, BuffManager, BattleUIRenderer)
- [x] **Task B**: 보안 개선 (httpOnly cookie, any 타입 정리, 에러 핸들링)
- [x] **Task C**: E2E 테스트 보강 (Playwright 시나리오 5개)
- [x] **Task D**: Vercel/Railway 재배포 + CORS 검증

### 2.2 Out of Scope

- 새로운 게임 기능 추가 (Phase 2 완료 후 Phase 3에서)
- 성능 최적화 (프로파일링 기반 최적화는 별도 세션)
- 모바일 반응형 UI (현재 데스크톱 중심)
- 멀티플레이어 기능 (MVP 범위 외)

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | BattleScene.ts를 SkillManager, BuffManager, BattleUIRenderer, MonsterAI로 분리 | High | Pending |
| FR-02 | 각 모듈은 독립적으로 테스트 가능해야 함 | High | Pending |
| FR-03 | JWT 인증을 httpOnly cookie로 전환 | High | Pending |
| FR-04 | 서버/클라이언트 `any` 타입을 적절한 타입으로 교체 (우선순위: Phaser-React bridge) | Medium | Pending |
| FR-05 | Playwright E2E 테스트 5개 시나리오 작성 (회원가입, 전투, 세이브/로드, Settings, 미니게임) | Medium | Pending |
| FR-06 | Vercel/Railway 재배포 후 프론트엔드 → 백엔드 API 연결 검증 | High | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| 유지보수성 | 각 모듈 파일 크기 < 500줄 | wc -l 명령 |
| 보안 | httpOnly cookie 사용, XSS 방어 | 브라우저 DevTools 검증 |
| 타입 안정성 | `any` 타입 사용 최소화 (허용: Phaser 내부 타입 불가피한 경우) | TypeScript 컴파일러 strict mode |
| 테스트 커버리지 | E2E 테스트로 핵심 플로우 5개 커버 | Playwright 테스트 실행 |
| 배포 안정성 | Vercel/Railway 배포 후 Health Check 통과 | curl 검증 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [x] BattleScene.ts 분리 완료 (4개 모듈 생성, 각 < 500줄)
- [x] 모든 빌드 통과 (`shared`, `game-engine`, `web`)
- [x] httpOnly cookie 인증 구현 및 검증
- [x] `any` 타입 정리 (최소 Phaser-React bridge 영역)
- [x] Playwright 테스트 5개 시나리오 작성 및 통과
- [x] Vercel/Railway 재배포 완료
- [x] 프론트엔드 → 백엔드 API CORS 검증

### 4.2 Quality Criteria

- [x] TypeScript 컴파일 에러 0개
- [x] ESLint 에러 0개
- [x] 모든 E2E 테스트 통과
- [x] 배포된 환경에서 실제 게임 플레이 가능

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| BattleScene 분리 중 버그 발생 | High | Medium | 각 모듈 분리 후 즉시 빌드 검증, 기존 기능 유지 확인 |
| httpOnly cookie 전환 시 CORS 문제 | High | Medium | credentials: 'include' 추가, Railway 환경변수 확인 |
| Playwright 테스트 환경 설정 실패 | Medium | Low | 로컬 환경에서 먼저 검증 후 CI 통합 |
| 배포 중 환경변수 누락 | Medium | Medium | Vercel/Railway 환경변수 체크리스트 사전 작성 |
| 멀티에이전트 간 파일 충돌 | Medium | Medium | 파일 소유권 명확히 분리 (BattleScene=claude-2, server=claude-3, web+tests=claude-4) |

---

## 6. Architecture Considerations

### 6.1 Project Level Selection

| Level | Characteristics | Recommended For | Selected |
|-------|-----------------|-----------------|:--------:|
| **Starter** | Simple structure (`components/`, `lib/`, `types/`) | Static sites, portfolios, landing pages | ☐ |
| **Dynamic** | Feature-based modules, services layer | Web apps with backend, SaaS MVPs | ☑ |
| **Enterprise** | Strict layer separation, DI, microservices | High-traffic systems, complex architectures | ☐ |

**Rationale**: Bug Slayer는 풀스택 웹게임 (Next.js + Express)으로 Dynamic 레벨 적합.

### 6.2 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| 게임 엔진 | Phaser 3 / PixiJS / Custom Canvas | **Phaser 3** | 이미 구현된 기반 유지 |
| 상태 관리 | Context / Zustand / Redux | **React Context** | 간단한 전역 상태 (user, settings) |
| API 클라이언트 | fetch / axios | **fetch** | Native API, credentials 지원 |
| 인증 방식 | JWT localStorage / httpOnly cookie | **httpOnly cookie** | XSS 방어 강화 |
| 테스팅 | Jest / Playwright | **Playwright** | E2E 테스트 중심 |
| 배포 | Vercel (Frontend) / Railway (Backend) | **Vercel + Railway** | 기존 환경 유지 |

### 6.3 Clean Architecture Approach

```
Selected Level: Dynamic

Current Monorepo Structure:
┌─────────────────────────────────────────────────────┐
│ apps/                                               │
│   ├── web/          # Next.js 14 frontend           │
│   │   ├── app/      # App Router                    │
│   │   ├── components/                               │
│   │   └── contexts/ # React Context                 │
│   └── server/       # Express backend               │
│       ├── src/                                       │
│       │   ├── routes/                                │
│       │   ├── middleware/                            │
│       │   └── db/                                    │
├── packages/                                          │
│   ├── shared/       # 공유 타입, 유틸                │
│   └── game-engine/  # Phaser 3 게임 로직            │
│       ├── scenes/                                    │
│       └── systems/  # 새로운 모듈 위치               │
│           ├── SkillManager.ts      (신규)          │
│           ├── BuffManager.ts       (신규)          │
│           ├── BattleUIRenderer.ts  (신규)          │
│           └── MonsterAI.ts         (기존 확장)      │
└── tests/           # E2E 테스트                      │
    └── e2e/         # Playwright                      │
└─────────────────────────────────────────────────────┘
```

**BattleScene 리팩토링 후 구조**:
```typescript
// Before: BattleScene.ts (2166 lines)
class BattleScene {
  // 모든 로직이 한 파일에...
}

// After: 모듈 분리
BattleScene.ts       (~500 lines)  - 씬 라이프사이클, 턴 루프 조율
SkillManager.ts      (~300 lines)  - 스킬 사용, 쿨다운, MP 관리
BuffManager.ts       (~200 lines)  - 버프/디버프 적용, 턴 만료
BattleUIRenderer.ts  (~400 lines)  - UI 렌더링 (HP/MP바, 데미지 표시)
MonsterAI.ts         (~300 lines)  - Enemy AI + behaviorTree 확장
```

---

## 7. Convention Prerequisites

### 7.1 Existing Project Conventions

- [x] `CLAUDE.md` 존재 (프로젝트 전반 규칙)
- [ ] `docs/01-plan/conventions.md` 없음 (Phase 2에서 생성 예정)
- [ ] `CONVENTIONS.md` 없음
- [x] ESLint 설정 (`.eslintrc.json`)
- [x] Prettier 설정 (`.prettierrc`)
- [x] TypeScript 설정 (`tsconfig.json` - strict mode)

### 7.2 Conventions to Define/Verify

| Category | Current State | To Define | Priority |
|----------|---------------|-----------|:--------:|
| **Naming** | 암묵적 (PascalCase 클래스) | 명시적 문서화 필요 | Medium |
| **Folder structure** | 존재 (위 6.3 참조) | 신규 모듈 위치 규칙 | High |
| **Import order** | Prettier 자동 정렬 | 순서 규칙 명시 | Low |
| **Environment variables** | `.env.example` 존재 | `CORS_ORIGIN` 추가 필요 | High |
| **Error handling** | 부분적 구현 | 표준화된 에러 응답 필요 | Medium |

### 7.3 Environment Variables Needed

| Variable | Purpose | Scope | To Be Created |
|----------|---------|-------|:-------------:|
| `NEXT_PUBLIC_API_URL` | 백엔드 API 엔드포인트 | Client | ☑ (기존) |
| `DATABASE_URL` | SQLite 파일 경로 (file:./prod.db) | Server | ☑ (기존) |
| `JWT_SECRET` | JWT 서명 키 | Server | ☑ (기존) |
| `CORS_ORIGIN` | CORS 허용 출처 | Server | ☐ (신규) |
| `COOKIE_DOMAIN` | httpOnly cookie 도메인 | Server | ☐ (신규) |

### 7.4 Pipeline Integration

이 작업은 Phase 2 (콘텐츠 확장) 완료 후 기술 개선 세션이므로, 기존 9-phase Pipeline과 별도로 진행합니다.

**Phase 2 완료 상태**:
- [x] Session 1: Polish (EXP, 골드, 스킬 쿨다운)
- [x] Session 2: Endings + Classes
- [x] Session 3: Minigame + Sound
- [ ] Session 4: **Tech Improvement (현재)**

---

## 8. Task Breakdown

### 8.1 Task A: BattleScene.ts 리팩토링

**담당**: claude-2 (Worker)

**세부 작업**:
1. SkillManager.ts 생성
   - `handleSkillUse()` 로직 이동
   - 스킬 쿨다운 관리
   - MP 계산 로직
2. BuffManager.ts 생성
   - `applyBuff()`, `applyDebuff()` 이동
   - 턴 만료 로직
   - ActiveBuff 인터페이스 관리
3. BattleUIRenderer.ts 생성
   - `updateUI()` 로직 이동
   - HP/MP바, 스탯 텍스트 렌더링
   - 플래시 효과, 데미지 숫자 표시
4. MonsterAI.ts 확장
   - 기존 EnemyAI.ts 기반 확장
   - behaviorTree 실행
   - 보스 페이즈 전환 (75%/50%/25% HP)
5. BattleScene.ts 통합
   - 위 모듈 import 및 조합
   - 턴 루프만 담당
   - SoundManager 호출 유지
6. index.ts 업데이트
   - 새 모듈 export 추가

**검증**:
```bash
# 빌드 테스트
npx pnpm@8.15.1 --filter @bug-slayer/game-engine build
# 라인 수 확인
wc -l packages/game-engine/src/systems/*.ts
```

### 8.2 Task B: 보안 개선

**담당**: claude-3 (Worker)

**세부 작업**:
1. httpOnly Cookie 구현
   - 서버: `apps/server/src/routes/auth.ts` 수정
     - 로그인 응답에 `res.cookie()` 추가
     - `httpOnly: true`, `secure: true`, `sameSite: 'strict'`
   - 클라이언트: `apps/web/app/` API 호출 수정
     - `credentials: 'include'` 추가
     - localStorage 토큰 제거
2. `any` 타입 정리
   - Phaser-React bridge (`apps/web/components/PhaserGame.tsx`)
   - 서버 API 핸들러 (`apps/server/src/routes/*.ts`)
   - 공유 타입 재사용 (`@bug-slayer/shared`)
3. API 에러 핸들링 강화
   - 서버: 표준화된 에러 응답 (`{ error: string, code: number }`)
   - 클라이언트: 에러 핸들링 UI (Toast 또는 ErrorBoundary)

**검증**:
```bash
# 타입 체크
npx pnpm@8.15.1 --filter @bug-slayer/server build
npx pnpm@8.15.1 --filter @bug-slayer/web build
# 브라우저 DevTools에서 cookie 확인
```

### 8.3 Task C: E2E 테스트 보강

**담당**: claude-4 (Worker)

**세부 작업**:
1. Playwright 설치 (이미 완료 확인)
2. 테스트 시나리오 작성 (`tests/e2e/`)
   - `auth.spec.ts`: 회원가입 → 로그인
   - `battle.spec.ts`: 클래스 선택 → Ch.1 전투 1회
   - `saveload.spec.ts`: 세이브/로드 기능
   - `settings.spec.ts`: Settings 패널 (볼륨 조절)
   - `minigame.spec.ts`: Deploy Roulette 진입
3. 테스트 실행 및 디버깅

**검증**:
```bash
cd /home/claude/Claude/ai-gdd/bug-slayer
npx playwright test
```

### 8.4 Task D: 배포 업데이트

**담당**: claude-4 (Worker, Task C와 순차 실행)

**세부 작업**:
1. Vercel 재배포
   - Node 20 전환 확인
   - 환경변수 확인 (`NEXT_PUBLIC_API_URL`)
   - `npx vercel deploy --prod --yes --token=$VERCEL_TOKEN`
2. Railway 재배포
   - 환경변수 확인 (`DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`)
   - `railway login --token=$RAILWAY_TOKEN`
   - `cd apps/server && railway up`
3. CORS/API 연결 테스트
   - 프론트엔드 → 백엔드 API 호출 (회원가입, 로그인)
   - 브라우저 Network 탭에서 cookie 확인

**검증**:
```bash
# Health check
curl https://out-tau-jade.vercel.app
curl https://bug-slayer-api-production.up.railway.app/health
```

---

## 9. Multi-Agent Orchestration

### 9.1 Agent Assignment

| Agent | Port | Role | Tasks | Exclusive Files |
|-------|------|------|-------|-----------------|
| **claude-1** | 9091 | PM (Main) | 전체 조율, 진행 상황 모니터링 | - |
| **claude-2** | 9092 | Worker | Task A (BattleScene 리팩토링) | `BattleScene.ts`, `systems/*.ts` (신규) |
| **claude-3** | 9093 | Worker | Task B (보안 개선) | `apps/server/src/**` |
| **claude-4** | 9094 | Worker | Task C+D (테스트 + 배포) | `tests/**`, `apps/web/**` |

### 9.2 Communication Protocol

**PM → Worker 명령 전달**:
```bash
tmux send-keys -t claude-2 "Task A 시작: BattleScene.ts 리팩토링" Enter && sleep 2 && tmux send-keys -t claude-2 "" Enter
```

**Worker 상태 확인**:
```bash
tmux capture-pane -t claude-2 -p -S -30
```

### 9.3 File Conflict Prevention

**공유 파일 (주의 필요)**:
- `packages/game-engine/src/index.ts` - claude-2가 새 모듈 export 추가

**순차 실행 필요**:
- Task C → Task D (claude-4): 테스트 통과 후 배포

---

## 10. Next Steps

1. [x] Design 문서 작성 (`phase2-tech-improvement.design.md`)
2. [x] PM이 claude-2, claude-3, claude-4에 작업 분배
3. [x] 각 Worker 작업 완료 후 빌드 검증
4. [x] Gap Analysis (`/pdca analyze phase2-tech-improvement`)
5. [x] 필요 시 Iteration (`/pdca iterate phase2-tech-improvement`)
6. [x] Completion Report (`/pdca report phase2-tech-improvement`)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-02-08 | Initial draft | AI Agent |
