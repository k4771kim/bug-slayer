# Bug Slayer E2E Tests

End-to-end tests for Bug Slayer: The Debugging Dungeon using Playwright.

## Test Coverage

This test suite covers the following critical user flows:

### 1. Authentication (`auth.spec.ts`)
- ✅ User registration
- ✅ User login with valid credentials
- ✅ Error handling for invalid login

### 2. Battle System (`battle.spec.ts`)
- ✅ Class selection (Debugger)
- ✅ Complete a battle (attack actions)
- ✅ Use skills in battle
- ✅ Use Focus action

### 3. Save/Load System (`saveload.spec.ts`)
- ✅ Save game progress
- ✅ Load saved game state
- ✅ Persist user stats across sessions

### 4. Settings Panel (`settings.spec.ts`)
- ✅ Open and close settings panel
- ✅ Adjust SFX volume
- ✅ Adjust BGM volume
- ✅ Toggle mute

### 5. Minigame (`minigame.spec.ts`)
- ✅ Enter Deploy Roulette minigame
- ✅ Display minigame questions
- ✅ Answer selection
- ✅ Complete minigame

## Prerequisites

1. **Install Playwright** (already done if you see this file):
   ```bash
   pnpm add -D -w @playwright/test
   ```

2. **Install Playwright browsers**:
   ```bash
   npx playwright install chromium
   ```

3. **System dependencies** (Linux only, optional for headless):
   ```bash
   # If running tests in headed mode, install system dependencies:
   sudo npx playwright install-deps
   ```

## Running Tests

### Run all tests (headless)
```bash
pnpm test:e2e
```

### Run tests with UI mode (interactive)
```bash
pnpm test:e2e:ui
```

### Run tests in headed mode (see browser)
```bash
pnpm test:e2e:headed
```

### Run specific test file
```bash
npx playwright test auth.spec.ts
```

### Run specific test by name
```bash
npx playwright test -g "should login with existing credentials"
```

## Test Configuration

Configuration is in `playwright.config.ts` at the project root:

- **Test directory**: `./tests/e2e`
- **Timeout**: 60 seconds per test
- **Base URL**: `http://localhost:3000`
- **Auto-start dev server**: Yes (via `webServer` config)
- **Screenshot**: Only on failure
- **Trace**: On first retry

## Test Architecture

### Authentication Flow
Tests create unique usernames with timestamps to avoid conflicts:
```typescript
const timestamp = Date.now();
const testUsername = `testuser_${timestamp}`;
```

### Phaser Canvas Interaction
Battle tests interact with Phaser game through:
- Data attributes (e.g., `[data-action="attack"]`)
- Text content (e.g., `button:has-text("Attack")`)
- Canvas element detection

### Wait Strategies
Tests use appropriate wait strategies:
- `waitForURL()` - Navigation completion
- `waitForSelector()` - Element appearance
- `waitForTimeout()` - Turn processing / animations

## Debugging Tests

### View test report
```bash
npx playwright show-report
```

### Debug mode (pause execution)
```bash
npx playwright test --debug
```

### Run with verbose output
```bash
npx playwright test --reporter=line
```

## CI/CD Integration

Tests are configured for CI environments:
- Retry failed tests 2 times on CI
- Run sequentially on CI (no parallel execution)
- Auto-detect CI via `process.env.CI`

## Known Limitations

1. **Selector dependencies**: Tests use multiple selector strategies to be resilient, but may need updates if UI changes significantly.

2. **Timing sensitivity**: Battle tests include timeouts for turn processing. Adjust if game logic changes.

3. **Minigame flow**: Minigame entry depends on completing Chapter 1. Test setup handles this but may be slow.

## Updating Tests

When updating game features, check these tests:

| Feature Change | Affected Tests |
|---------------|---------------|
| Auth flow | `auth.spec.ts` |
| Battle UI | `battle.spec.ts` |
| Save system | `saveload.spec.ts` |
| Settings panel | `settings.spec.ts` |
| Minigame mechanics | `minigame.spec.ts` |

## Best Practices

1. **Unique test data**: Use timestamps in usernames to avoid conflicts
2. **Resilient selectors**: Use data attributes when possible
3. **Appropriate waits**: Prefer `waitForSelector()` over fixed timeouts
4. **Cleanup**: Tests create their own accounts (no cleanup needed)
5. **Isolation**: Each test is independent and can run in any order

## Success Metrics

From design document Section 11.3:
- ✅ 5 test scenarios implemented
- ✅ Coverage: registration, battle, save/load, settings, minigame
- ✅ Automated via Playwright
- ✅ Ready for CI/CD integration

## Troubleshooting

### Tests fail with "cannot find canvas"
- Ensure dev server is running (`pnpm dev`)
- Increase timeout in test or config
- Check browser console for errors

### Tests time out
- Increase timeout in `playwright.config.ts`
- Check if dev server started successfully
- Verify game loads without errors

### System dependency warnings
- Install with: `sudo npx playwright install-deps`
- Or ignore if running headless (warnings don't prevent execution)

---

**Version**: 1.0.0
**Last Updated**: 2026-02-08
**Feature**: phase2-tech-improvement
