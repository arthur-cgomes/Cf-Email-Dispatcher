# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Run all tests with coverage (100% required — threshold enforced)
npm test

# Run tests in watch mode (no coverage)
npm run test:watch

# Run a single test file
npx jest tests/unit/SendEmailUseCase.spec.ts

# Type-check without emitting
npm run type-check

# Build
npm run build

# Lint
npm run lint
npm run lint:fix

# Format
npm run format
```

## Architecture

Clean Architecture with strict layer separation. Dependencies point inward only:

```
Presentation → Application → Domain
Infrastructure → Application → Domain
```

- **`src/domain/`** — Zero external dependencies. `Email` entity validates with `validator.isEmail()`. `LogRecord` holds the `EmailProvider` union type (`'sendgrid' | 'aws' | 'brevo'`). `ValidationError` and `ProviderError` are the only two error types.
- **`src/application/`** — `SendEmailUseCase` orchestrates: Zod parse → `Email.create()` → `sendWithRetry()` (3 attempts: 1 s, 2 s, 4 s) → log SUCCESS or ERROR. Ports `IEmailProvider` and `ILogRepository` are the inversion boundaries.
- **`src/infrastructure/`** — Implements ports. `env.ts` is the single source of truth for all env vars (`loadEnv()` throws at startup on missing required vars). `router.ts` is the composition root where all DI wiring happens. Providers receive credentials via constructor, never reading `process.env` directly.
- **`src/presentation/`** — `EmailController` maps use case errors to HTTP responses: `ValidationError` → 400, `ProviderError` → 500, unknown → 500 with generic message (no leakage).

## Key Conventions

**Adding a new email provider** requires 4 changes:
1. Add the name to `EmailProvider` union in `src/domain/entities/LogRecord.ts`
2. Add `requireEnv('NEW_API_KEY')` in `src/infrastructure/config/env.ts`
3. Create `src/infrastructure/providers/NewProvider.ts` — constructor receives the key, catch all SDK errors and rethrow as `ProviderError`, use `toErrorMessage(err)` for logging
4. Wire in `src/infrastructure/http/router.ts` inside `buildRouter(env)`

**Error handling pattern** — always use `toErrorMessage(err: unknown)` from `src/infrastructure/utils/toErrorMessage.ts` instead of `(err as Error).message`.

**Log failures are non-fatal** — `DatabaseLogRepository.save()` catches and logs its own errors. Never propagate DB failures to the HTTP layer.

## Testing

- `tsconfig.test.json` extends the base config with `rootDir: "."`, `noUnusedLocals: false`, and includes `tests/**/*` without excluding the tests folder (unlike the production `tsconfig.json`).
- `jest.config.ts` collects coverage from `src/**/*.ts` excluding `src/index.ts`.
- Coverage threshold is 80% globally but the project currently has **100% coverage** — maintain it.
- Fake timers are required for retry tests. Use this pattern to avoid unhandled rejection warnings:
  ```typescript
  const promise = useCase.execute(input);
  const assertion = expect(promise).rejects.toThrow(); // attach BEFORE advancing timers
  await jest.advanceTimersByTimeAsync(10_000);
  await assertion;
  ```
- `MockEmailProvider` supports `alwaysThrow` and `failCount` for retry scenarios.
- `MockLogRepository` supports `shouldThrow` and `shouldThrowOnCall` for log-failure scenarios.
- To cover a branch that requires mocking a module's internals (e.g. `sendEmailSchema.parse`), create a separate spec file using `jest.mock()` at module level — do not mix with the main suite.

## ESLint

Two tsconfigs are declared in `parserOptions.project` so that both `src/` and `tests/` are linted. The `overrides` block for `tests/**/*.ts` disables `explicit-function-return-type` and `no-explicit-any` and enables the `jest` environment.
