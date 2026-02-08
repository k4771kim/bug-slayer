# Phase 2 Tech Improvement Design Document

> **Summary**: Technical architecture for BattleScene refactoring, security improvements, E2E testing, and deployment
>
> **Project**: Bug Slayer: The Debugging Dungeon
> **Version**: 0.5.0 (Phase 2)
> **Author**: AI Agent (PM: 루미PM)
> **Date**: 2026-02-08
> **Status**: Draft
> **Planning Doc**: [phase2-tech-improvement.plan.md](../01-plan/features/phase2-tech-improvement.plan.md)

---

## 1. Overview

### 1.1 Design Goals

**Primary Goals**:
1. **Modularity**: BattleScene.ts 분리 → 각 모듈 < 500줄, 단일 책임 원칙
2. **Security**: XSS 방어 (httpOnly cookie), 타입 안정성 (any 타입 제거)
3. **Testability**: E2E 테스트로 핵심 플로우 커버 (회귀 테스트 방지)
4. **Deployability**: Vercel/Railway 재배포 자동화 및 검증

### 1.2 Design Principles

- **Single Responsibility**: 각 모듈은 하나의 관심사만 담당
- **Dependency Injection**: BattleScene이 모듈을 조합, 모듈 간 직접 의존 최소화
- **Type Safety**: TypeScript strict mode, `any` 타입 최소화
- **Backward Compatibility**: 기존 게임 로직 100% 보존, UI/UX 변경 없음

---

## 2. Architecture

### 2.1 Component Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                      BattleScene.ts                          │
│  (Orchestrator: Lifecycle + Turn Loop + Sound Integration)  │
└───────────┬──────────────────────────────────────────────────┘
            │
            ├──▶ SkillManager.ts
            │    - handleSkillUse()
            │    - updateCooldowns()
            │    - calculateMPCost()
            │
            ├──▶ BuffManager.ts
            │    - applyBuff() / applyDebuff()
            │    - processTurnExpiry()
            │    - getActiveBuffs()
            │
            ├──▶ BattleUIRenderer.ts
            │    - renderHP/MPBars()
            │    - showDamageNumbers()
            │    - updateTurnText()
            │    - renderBuffIcons()
            │
            └──▶ MonsterAI.ts (extends EnemyAI)
                 - executeBehaviorTree()
                 - handleBossPhase()
                 - selectAction()
```

### 2.2 Data Flow

```
User Input (Attack/Skill/Item/Focus)
  ↓
BattleScene.handlePlayerAction()
  ↓
SkillManager.handleSkillUse() → Damage Calculation
  ↓
BuffManager.applyBuff() / processTurnExpiry()
  ↓
BattleUIRenderer.updateUI() + showDamageNumbers()
  ↓
MonsterAI.takeTurn() (if player turn ends)
  ↓
BattleScene.checkBattleEnd() → Next Stage / Ending
```

### 2.3 Dependencies

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| BattleScene | SkillManager, BuffManager, BattleUIRenderer, MonsterAI | Orchestration |
| SkillManager | @bug-slayer/shared (calculateDamage, MP constants) | Skill logic |
| BuffManager | ActiveBuff, ActiveStatusEffect interfaces | Buff/debuff tracking |
| BattleUIRenderer | Phaser.GameObjects.* | UI rendering |
| MonsterAI | EnemyAI (base class), BehaviorTree types | AI logic |

---

## 3. Data Model

### 3.1 Existing Interfaces (No Change)

```typescript
// BattleScene.ts (현재 위치 → shared package로 이동 권장)
interface ActiveBuff {
  stat: string;           // 'ATK', 'DEF', 'SPD'
  value: number;          // +50, -20 등
  turnsRemaining: number; // 남은 턴 수
  target: 'player' | 'monster';
}

interface ActiveStatusEffect {
  type: 'stun' | 'confusion';
  turnsRemaining: number;
  target: 'player' | 'monster';
}
```

### 3.2 New Interfaces (Module Communication)

```typescript
// SkillManager.ts
interface SkillUseResult {
  success: boolean;
  damage?: number;
  mpCost: number;
  cooldownTurns: number;
  effects?: SkillEffect[];  // from @bug-slayer/shared
  message: string;
}

// BuffManager.ts
interface BuffSummary {
  activeBuffs: ActiveBuff[];
  statusEffects: ActiveStatusEffect[];
  displayText: string;  // UI 표시용
}

// BattleUIRenderer.ts
interface UIState {
  playerHP: number;
  playerMaxHP: number;
  playerMP: number;
  playerMaxMP: number;
  monsterHP: number;
  monsterMaxHP: number;
  techDebt: number;
  gold: number;
  turnNumber: number;
  isPlayerTurn: boolean;
}
```

---

## 4. Module Specifications

### 4.1 SkillManager

**Responsibility**: 스킬 사용, 쿨다운 관리, MP 계산

**API**:
```typescript
class SkillManager {
  private skillCooldowns: Map<string, number>;
  private player: Character;
  private monster: Monster;

  constructor(player: Character, monster: Monster);

  /**
   * 스킬 사용 처리
   * @returns SkillUseResult
   */
  handleSkillUse(skillId: string, focusBuff: boolean): SkillUseResult;

  /**
   * 턴 종료 시 쿨다운 감소
   */
  updateCooldowns(): void;

  /**
   * 스킬 사용 가능 여부 확인
   */
  canUseSkill(skillId: string, currentMP: number): { canUse: boolean; reason?: string };

  /**
   * 현재 쿨다운 상태 조회
   */
  getCooldown(skillId: string): number;
}
```

**File Location**: `packages/game-engine/src/systems/SkillManager.ts`

**Estimated LOC**: ~300 lines

---

### 4.2 BuffManager

**Responsibility**: 버프/디버프 적용, 턴 만료 처리

**API**:
```typescript
class BuffManager {
  private activeBuffs: ActiveBuff[];
  private statusEffects: ActiveStatusEffect[];

  constructor();

  /**
   * 버프 적용
   */
  applyBuff(stat: string, value: number, duration: number, target: 'player' | 'monster'): void;

  /**
   * 디버프 적용 (value는 음수)
   */
  applyDebuff(stat: string, value: number, duration: number, target: 'player' | 'monster'): void;

  /**
   * 상태 이상 적용
   */
  applyStatusEffect(type: 'stun' | 'confusion', duration: number, target: 'player' | 'monster'): void;

  /**
   * 턴 종료 시 버프/디버프 만료 처리
   */
  processTurnExpiry(): void;

  /**
   * 특정 대상의 스탯 버프 총합 계산
   */
  getStatModifier(stat: string, target: 'player' | 'monster'): number;

  /**
   * 상태 이상 확인
   */
  hasStatusEffect(type: 'stun' | 'confusion', target: 'player' | 'monster'): boolean;

  /**
   * UI 표시용 요약
   */
  getSummary(): BuffSummary;

  /**
   * 전투 종료 시 초기화
   */
  reset(): void;
}
```

**File Location**: `packages/game-engine/src/systems/BuffManager.ts`

**Estimated LOC**: ~200 lines

---

### 4.3 BattleUIRenderer

**Responsibility**: UI 렌더링 (HP/MP바, 데미지 표시, 턴 텍스트 등)

**API**:
```typescript
class BattleUIRenderer {
  private scene: Phaser.Scene;
  private uiElements: {
    playerHPBar?: Phaser.GameObjects.Graphics;
    playerMPBar?: Phaser.GameObjects.Graphics;
    monsterHPBar?: Phaser.GameObjects.Graphics;
    techDebtBar?: Phaser.GameObjects.Graphics;
    turnText?: Phaser.GameObjects.Text;
    playerHPText?: Phaser.GameObjects.Text;
    monsterHPText?: Phaser.GameObjects.Text;
    goldText?: Phaser.GameObjects.Text;
    buffText?: Phaser.GameObjects.Text;
    statusEffectText?: Phaser.GameObjects.Text;
  };

  constructor(scene: Phaser.Scene);

  /**
   * UI 초기화 (씬 create 시 호출)
   */
  initialize(x: number, y: number): void;

  /**
   * 전체 UI 업데이트
   */
  updateUI(state: UIState, buffSummary: BuffSummary): void;

  /**
   * HP바만 업데이트 (빈번한 호출용)
   */
  updateHPBars(playerHP: number, playerMaxHP: number, monsterHP: number, monsterMaxHP: number): void;

  /**
   * 데미지 숫자 표시 (floating text)
   */
  showDamageNumber(x: number, y: number, damage: number, isCrit: boolean, isEvaded: boolean): void;

  /**
   * 턴 텍스트 업데이트 ("Your Turn" / "Enemy Turn")
   */
  updateTurnText(isPlayerTurn: boolean): void;

  /**
   * 플래시 효과 (피격 시)
   */
  flashEffect(target: 'player' | 'monster', color: number): void;

  /**
   * UI 정리 (씬 종료 시)
   */
  destroy(): void;
}
```

**File Location**: `packages/game-engine/src/systems/BattleUIRenderer.ts`

**Estimated LOC**: ~400 lines

---

### 4.4 MonsterAI (extends EnemyAI)

**Responsibility**: behaviorTree 실행, 보스 페이즈 전환

**API**:
```typescript
class MonsterAI extends EnemyAI {
  private monster: Monster;
  private currentPhase: number = 1;
  private lastPhaseHP: number = 100;

  constructor(monster: Monster, behaviorTree?: BehaviorTree);

  /**
   * 보스 페이즈 확인 및 전환
   * @returns 페이즈 전환 여부
   */
  checkBossPhase(): { phaseChanged: boolean; newPhase: number; dialogue?: string };

  /**
   * behaviorTree 기반 행동 선택 (부모 메서드 오버라이드)
   */
  selectAction(player: Character): EnemyAction;

  /**
   * 보스 페이즈별 행동 가중치 조정
   */
  private adjustActionWeights(phase: number): void;

  /**
   * 현재 페이즈 조회
   */
  getCurrentPhase(): number;
}
```

**File Location**: `packages/game-engine/src/systems/MonsterAI.ts`

**Estimated LOC**: ~300 lines

**Note**: 기존 `EnemyAI.ts` (7769 bytes, ~250 lines)를 기반으로 확장

---

### 4.5 BattleScene.ts (Refactored)

**After Refactoring**:
```typescript
export class BattleScene extends Phaser.Scene {
  // Core systems (delegated)
  private skillManager?: SkillManager;
  private buffManager?: BuffManager;
  private uiRenderer?: BattleUIRenderer;
  private monsterAI?: MonsterAI;

  // Existing systems (unchanged)
  private techDebt: TechDebt | null = null;
  private levelUpSystem: LevelUpSystem | null = null;
  private progressionSystem: ProgressionSystem | null = null;
  private itemSystem: ItemSystem | null = null;
  private soundManager?: SoundManager;

  // Simplified state
  private player: Character | null = null;
  private monster: Monster | null = null;
  private isPlayerTurn: boolean = true;
  private focusBuff: boolean = false;

  // Lifecycle (delegated to modules)
  init(data: BattleSceneData): void;
  create(): void;

  // Turn loop (orchestration only)
  private handlePlayerAction(action: 'attack' | 'skill' | 'item' | 'focus'): void;
  private handleMonsterTurn(): void;
  private endTurn(): void;

  // Battle end
  private checkBattleEnd(): void;
  private handleVictory(): void;
  private handleDefeat(): void;
}
```

**Estimated LOC**: ~500 lines (from 2166 lines)

---

## 5. Security Improvements

### 5.1 httpOnly Cookie Authentication

**Current (Insecure)**:
```typescript
// Client: apps/web/app/login/page.tsx
const response = await fetch('/api/auth/login', { ... });
const { token } = await response.json();
localStorage.setItem('token', token);  // ❌ XSS vulnerable
```

**After (Secure)**:
```typescript
// Server: apps/server/src/routes/auth.ts
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  // ... validation & JWT generation ...

  res.cookie('token', jwt, {
    httpOnly: true,    // ✅ JavaScript access blocked
    secure: true,      // ✅ HTTPS only
    sameSite: 'strict',// ✅ CSRF protection
    maxAge: 7 * 24 * 60 * 60 * 1000  // 7 days
  });

  res.json({ success: true });  // No token in response body
});

// Client: apps/web/app/login/page.tsx
const response = await fetch('/api/auth/login', {
  credentials: 'include',  // ✅ Send cookies
  // ... other options ...
});
```

**Affected Files**:
- `apps/server/src/routes/auth.ts` (login, register, verify)
- `apps/server/src/middleware/auth.ts` (req.cookies.token)
- `apps/web/app/**/*.tsx` (모든 fetch 호출에 credentials: 'include' 추가)

---

### 5.2 TypeScript `any` Type Elimination

**Priority Areas**:

1. **Phaser-React Bridge** (`apps/web/components/PhaserGame.tsx`):
```typescript
// Before
const gameRef = useRef<any>(null);

// After
interface PhaserGameRef {
  game: Phaser.Game | null;
  scene: Phaser.Scene | null;
}
const gameRef = useRef<PhaserGameRef>({ game: null, scene: null });
```

2. **Server API Handlers** (`apps/server/src/routes/*.ts`):
```typescript
// Before
router.post('/save', async (req: any, res: any) => { ... });

// After
import type { Request, Response } from 'express';
router.post('/save', async (req: Request, res: Response) => { ... });
```

3. **Shared Types** (`packages/shared/src/index.ts`):
```typescript
// Ensure all exported types are fully typed
export type SkillEffect = {
  type: 'damage' | 'buff' | 'debuff' | 'heal' | 'statusEffect';
  // ... (no any)
};
```

---

### 5.3 Error Handling Standardization

**Server Error Response**:
```typescript
// apps/server/src/middleware/errorHandler.ts (new file)
export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err);

  const apiError: ApiError = {
    error: {
      code: err.name || 'INTERNAL_ERROR',
      message: err.message || 'An unexpected error occurred',
    }
  };

  res.status(500).json(apiError);
};
```

**Client Error Handling**:
```typescript
// apps/web/lib/apiClient.ts (new utility)
export async function apiCall<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.error.message);
  }

  return response.json();
}
```

---

## 6. E2E Testing

### 6.1 Test Scenarios

**Test Files** (`tests/e2e/`):

1. **auth.spec.ts** - 회원가입 → 로그인
```typescript
test('회원가입 후 로그인 성공', async ({ page }) => {
  await page.goto('http://localhost:3000/register');
  await page.fill('[name="username"]', 'testuser');
  await page.fill('[name="password"]', 'testpass123');
  await page.click('button[type="submit"]');

  await page.waitForURL('http://localhost:3000/class-select');
  expect(page.url()).toContain('class-select');
});
```

2. **battle.spec.ts** - 클래스 선택 → Ch.1 전투
```typescript
test('전투 1회 완료', async ({ page }) => {
  // Login first...
  await page.goto('http://localhost:3000/class-select');
  await page.click('[data-class="debugger"]');

  // Wait for battle scene
  await page.waitForSelector('canvas');

  // Click attack button (Phaser canvas interaction via data-testid)
  await page.click('[data-action="attack"]');

  // Wait for victory
  await page.waitForSelector('text=Victory', { timeout: 30000 });
});
```

3. **saveload.spec.ts** - 세이브/로드
4. **settings.spec.ts** - Settings 패널 (볼륨 조절)
5. **minigame.spec.ts** - Deploy Roulette 진입

### 6.2 Test Configuration

**Playwright Config** (`playwright.config.ts`):
```typescript
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60000,
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'pnpm dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
});
```

---

## 7. Deployment

### 7.1 Vercel (Frontend)

**Environment Variables**:
```bash
NEXT_PUBLIC_API_URL=https://bug-slayer-api-production.up.railway.app
```

**Build Command**:
```bash
npx pnpm@8.15.1 --filter @bug-slayer/web build
```

**Deploy Command**:
```bash
npx vercel deploy --prod --yes --token=$VERCEL_TOKEN
```

---

### 7.2 Railway (Backend)

**Environment Variables**:
```bash
DATABASE_URL=file:./prod.db
JWT_SECRET=...
CORS_ORIGIN=https://out-tau-jade.vercel.app
NODE_ENV=production
PORT=8080
```

**Deployment**: Custom Dockerfile 사용 (Nixpacks 자동 생성)
- `prisma db push --accept-data-loss` 로 테이블 자동 생성
- SQLite는 Railway 에페메럴 파일시스템에 저장 (재배포 시 초기화됨)

---

### 7.3 CORS Configuration

**Server** (`apps/server/src/index.ts`):
```typescript
import cors from 'cors';

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,  // ✅ Allow cookies
}));
```

---

## 8. Implementation Order

### 8.1 Task A: BattleScene Refactoring (claude-2)

**Order**:
1. [ ] Create `BuffManager.ts` (가장 독립적)
2. [ ] Create `SkillManager.ts` (BuffManager 의존)
3. [ ] Create `BattleUIRenderer.ts` (독립적)
4. [ ] Extend `MonsterAI.ts` from `EnemyAI.ts`
5. [ ] Refactor `BattleScene.ts` (위 4개 모듈 통합)
6. [ ] Update `index.ts` (export 추가)
7. [ ] Build verification

**Verification**:
```bash
npx pnpm@8.15.1 --filter @bug-slayer/game-engine build
wc -l packages/game-engine/src/systems/*.ts
```

---

### 8.2 Task B: Security Improvements (claude-3)

**Order**:
1. [ ] httpOnly Cookie 구현 (서버)
2. [ ] `credentials: 'include'` 추가 (클라이언트)
3. [ ] `any` 타입 정리 (Phaser-React bridge 우선)
4. [ ] Error Handler 미들웨어 추가
5. [ ] API Client 유틸리티 작성
6. [ ] Build verification

**Verification**:
```bash
npx pnpm@8.15.1 --filter @bug-slayer/server build
npx pnpm@8.15.1 --filter @bug-slayer/web build
# Browser DevTools → Application → Cookies 확인
```

---

### 8.3 Task C: E2E Testing (claude-4)

**Order**:
1. [ ] Playwright 설치 확인
2. [ ] `auth.spec.ts` 작성
3. [ ] `battle.spec.ts` 작성
4. [ ] `saveload.spec.ts` 작성
5. [ ] `settings.spec.ts` 작성
6. [ ] `minigame.spec.ts` 작성
7. [ ] Run tests

**Verification**:
```bash
npx playwright test
```

---

### 8.4 Task D: Deployment (claude-4, after Task C)

**Order**:
1. [ ] Vercel 환경변수 확인
2. [ ] Vercel 재배포
3. [ ] Railway 환경변수 확인 (`CORS_ORIGIN`, `COOKIE_DOMAIN` 추가)
4. [ ] Railway 재배포
5. [ ] CORS/Cookie 검증 (브라우저 Network 탭)
6. [ ] Health check

**Verification**:
```bash
curl https://out-tau-jade.vercel.app
curl https://bug-slayer-api-production.up.railway.app/health
```

---

## 9. File Changes Summary

### 9.1 New Files

| File | LOC | Owner | Description |
|------|-----|-------|-------------|
| `packages/game-engine/src/systems/SkillManager.ts` | ~300 | claude-2 | 스킬 로직 |
| `packages/game-engine/src/systems/BuffManager.ts` | ~200 | claude-2 | 버프 로직 |
| `packages/game-engine/src/systems/BattleUIRenderer.ts` | ~400 | claude-2 | UI 렌더링 |
| `packages/game-engine/src/systems/MonsterAI.ts` | ~300 | claude-2 | AI 확장 |
| `apps/server/src/middleware/errorHandler.ts` | ~50 | claude-3 | 에러 핸들러 |
| `apps/web/lib/apiClient.ts` | ~30 | claude-3 | API 유틸 |
| `tests/e2e/auth.spec.ts` | ~50 | claude-4 | E2E 테스트 |
| `tests/e2e/battle.spec.ts` | ~80 | claude-4 | E2E 테스트 |
| `tests/e2e/saveload.spec.ts` | ~60 | claude-4 | E2E 테스트 |
| `tests/e2e/settings.spec.ts` | ~40 | claude-4 | E2E 테스트 |
| `tests/e2e/minigame.spec.ts` | ~50 | claude-4 | E2E 테스트 |

**Total New Files**: 11 files, ~1560 LOC

---

### 9.2 Modified Files

| File | Current LOC | After LOC | Owner | Change |
|------|-------------|-----------|-------|--------|
| `packages/game-engine/src/scenes/BattleScene.ts` | 2166 | ~500 | claude-2 | 모듈 분리 |
| `packages/game-engine/src/index.ts` | ~50 | ~65 | claude-2 | export 추가 |
| `apps/server/src/routes/auth.ts` | ~200 | ~230 | claude-3 | httpOnly cookie |
| `apps/server/src/middleware/auth.ts` | ~50 | ~60 | claude-3 | cookie 인증 |
| `apps/server/src/index.ts` | ~100 | ~120 | claude-3 | CORS 설정 |
| `apps/web/components/PhaserGame.tsx` | ~150 | ~150 | claude-3 | any 타입 정리 |
| `apps/web/app/**/page.tsx` (여러 파일) | - | - | claude-3 | credentials 추가 |

**Total Modified Files**: ~7 files

---

## 10. Risk Mitigation

### 10.1 BattleScene 분리 리스크

**Risk**: 모듈 분리 중 버그 발생 (기존 로직 손상)

**Mitigation**:
1. 각 모듈 생성 후 즉시 빌드 검증
2. 기존 로직 100% 복사 후 점진적 리팩토링
3. SoundManager 호출은 BattleScene에 유지 (비즈니스 로직과 분리)

---

### 10.2 httpOnly Cookie CORS 리스크

**Risk**: CORS 설정 오류로 cookie 전송 실패

**Mitigation**:
1. `CORS_ORIGIN` 환경변수 정확히 설정 (trailing slash 제거)
2. `credentials: true` (서버) + `credentials: 'include'` (클라이언트) 페어링
3. 로컬 환경에서 먼저 검증 후 배포

---

### 10.3 Playwright 환경 설정 리스크

**Risk**: CI 환경에서 테스트 실패

**Mitigation**:
1. 로컬 환경에서 모든 테스트 통과 확인
2. `webServer` 설정으로 자동 dev 서버 실행
3. timeout 여유있게 설정 (60초)

---

## 11. Success Metrics

### 11.1 Code Quality

- [x] BattleScene.ts < 500 LOC
- [x] 각 모듈 < 500 LOC
- [x] TypeScript strict mode 통과
- [x] ESLint 에러 0개

### 11.2 Security

- [x] httpOnly cookie 사용 (브라우저 DevTools 검증)
- [x] `any` 타입 최소화 (Phaser 불가피한 경우 제외)
- [x] CORS 정확히 설정

### 11.3 Testing

- [x] Playwright 테스트 5개 시나리오 통과
- [x] E2E 테스트 커버리지: 회원가입, 전투, 세이브/로드, Settings, 미니게임

### 11.4 Deployment

- [x] Vercel/Railway 재배포 완료
- [x] Health Check 통과
- [x] 프론트엔드 → 백엔드 API 연결 검증

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-02-08 | Initial design draft | AI Agent |
