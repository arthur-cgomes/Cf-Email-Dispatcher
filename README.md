# cf-send-email

A serverless/Cloud Function-ready email dispatcher built with **TypeScript** and **Clean Architecture**. Supports **SendGrid**, **AWS SES**, and **Brevo** as interchangeable email providers. Every send attempt (success or failure) is logged to **PostgreSQL**.

---

## Table of Contents

- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Setup](#setup)
- [Running the Server](#running-the-server)
- [API Endpoints](#api-endpoints)
- [Running Tests](#running-tests)
- [Database Schema](#database-schema)
- [Adding a New Provider](#adding-a-new-provider)
- [Environment Variables](#environment-variables)

---

## Architecture

This project follows **Clean Architecture** with strict layer separation:

```
┌─────────────────────────────────────┐
│           Presentation              │  HTTP controllers (Express req/res)
│           EmailController           │
├─────────────────────────────────────┤
│           Application               │  Use cases, ports (interfaces), DTOs
│     SendEmailUseCase                │
│     IEmailProvider / ILogRepository │
├─────────────────────────────────────┤
│           Domain                    │  Entities, errors — ZERO external deps
│     Email / LogRecord               │
│     ValidationError / ProviderError │
├─────────────────────────────────────┤
│         Infrastructure              │  Provider/DB implementations, router
│  SendGridProvider / AwsSesProvider  │
│  BrevoProvider / DatabaseLogRepo    │
└─────────────────────────────────────┘
```

### Key Design Decisions

| Decision | Rationale |
|---|---|
| **Dual validation (Zod + entity)** | Zod validates at the HTTP boundary with rich error messages. The `Email` entity enforces domain invariants independently of any framework. |
| **Central env validation** | `loadEnv()` validates all required variables at startup and fails fast before any route is registered. Providers receive credentials via constructor injection — never read `process.env` directly. |
| **Manual DI in `router.ts`** | Single composition root — no DI container needed. Keeps dependencies explicit and testable. |
| **Retry with exponential backoff** | `SendEmailUseCase` retries transient failures up to 3 times (1 s → 2 s → 4 s) before logging an ERROR and re-throwing. |
| **Log errors are non-fatal** | `DatabaseLogRepository.save()` swallows its own errors. A DB outage never converts a successful email delivery (200) into a 500. |
| **ProviderError sanitization** | Providers catch SDK exceptions, log them server-side, and re-throw only a `ProviderError` with a safe string. API keys and SDK internals never reach HTTP clients. |
| **Rate limiting & CORS** | `express-rate-limit` (default: 20 req/min per IP) and `cors` with configurable origin are applied globally at the router level. |
| **Request ID tracing** | Every request gets an `x-request-id` header (UUID v4) for correlation across logs. |

---

## Project Structure

```
cf-send-email/
├── src/
│   ├── domain/
│   │   ├── entities/
│   │   │   ├── Email.ts              # Email entity with validation (validator.isEmail)
│   │   │   └── LogRecord.ts          # Log entry value object
│   │   └── errors/
│   │       ├── ValidationError.ts    # Domain validation errors
│   │       └── ProviderError.ts      # Safe provider errors (no credential leakage)
│   ├── application/
│   │   ├── ports/
│   │   │   ├── IEmailProvider.ts     # Email provider contract
│   │   │   └── ILogRepository.ts     # Log repository contract
│   │   ├── dtos/
│   │   │   └── SendEmailDTO.ts       # Zod schema + inferred type
│   │   └── use-cases/
│   │       └── SendEmailUseCase.ts   # Orchestration + retry with exponential backoff
│   ├── infrastructure/
│   │   ├── config/
│   │   │   └── env.ts                # Central env validation (loadEnv)
│   │   ├── providers/
│   │   │   ├── SendGridProvider.ts
│   │   │   ├── AwsSesProvider.ts
│   │   │   └── BrevoProvider.ts
│   │   ├── repositories/
│   │   │   └── DatabaseLogRepository.ts  # PostgreSQL implementation
│   │   ├── database/
│   │   │   └── pgClient.ts           # Singleton pg Pool (configurable)
│   │   ├── utils/
│   │   │   └── toErrorMessage.ts     # Type-safe unknown → string conversion
│   │   └── http/
│   │       └── router.ts             # DI composition root + rate limiting
│   ├── presentation/
│   │   └── EmailController.ts        # HTTP req/res handler
│   └── index.ts                      # Entry point (CORS, payload limit, request ID)
├── tests/
│   └── unit/
│       ├── Email.spec.ts
│       ├── SendEmailUseCase.spec.ts
│       ├── SendEmailUseCase.parseError.spec.ts
│       ├── EmailController.spec.ts
│       ├── DatabaseLogRepository.spec.ts
│       ├── ValidationError.spec.ts
│       ├── toErrorMessage.spec.ts
│       └── mocks/
│           ├── MockEmailProvider.ts
│           └── MockLogRepository.ts
├── docs/
│   ├── cf-send-email.postman_collection.json
│   └── README.md
├── .env.example
├── jest.config.ts
├── tsconfig.json
├── tsconfig.test.json
└── package.json
```

---

## Setup

### Prerequisites

- Node.js >= 20
- npm >= 10
- PostgreSQL instance (for log storage)

### Install

```bash
git clone <repo-url>
cd cf-send-email
npm install
```

### Configure environment

```bash
cp .env.example .env
# Edit .env with your actual credentials
```

### Create the log table

Connect to your PostgreSQL database and run:

```sql
CREATE TABLE IF NOT EXISTS email_logs (
  id              UUID         PRIMARY KEY,
  provider        VARCHAR(20)  NOT NULL,
  recipient_email VARCHAR(255) NOT NULL,
  status          VARCHAR(10)  NOT NULL,
  error_reason    TEXT,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
```

---

## Running the Server

```bash
# Development (hot reload)
npm run dev

# Production
npm run build
npm start
```

The server starts on `http://localhost:3000` (or the `PORT` environment variable).

---

## API Endpoints

### Health Check

```
GET /health
```

Response:
```json
{ "status": "ok", "timestamp": "2025-01-01T00:00:00.000Z" }
```

---

### Send Email

All three endpoints share the same request/response schema.

| Method | Path            | Provider  |
|--------|-----------------|-----------|
| `POST` | `/send/sendgrid` | SendGrid |
| `POST` | `/send/aws`      | AWS SES  |
| `POST` | `/send/brevo`    | Brevo    |

#### Request Body

```json
{
  "to": "recipient@example.com",
  "from": "sender@yourdomain.com",
  "subject": "Hello World",
  "body": "<p>This is the email body (HTML supported)</p>"
}
```

#### Responses

**200 — Success**
```json
{ "message": "Email sent successfully" }
```

**400 — Validation Error**
```json
{
  "error": "Request validation failed",
  "fieldErrors": {
    "to": ["Invalid recipient email address"],
    "subject": ["Subject cannot be empty"]
  }
}
```

**429 — Rate Limit Exceeded**
```json
{ "error": "Too many requests, please try again later." }
```

**500 — Provider Error**
```json
{ "error": "[sendgrid] Failed to send email via SendGrid" }
```

#### Example cURL

```bash
curl -X POST http://localhost:3000/send/sendgrid \
  -H "Content-Type: application/json" \
  -d '{
    "to": "user@example.com",
    "from": "noreply@yourdomain.com",
    "subject": "Welcome!",
    "body": "<h1>Hello from cf-send-email</h1>"
  }'
```

---

## Running Tests

```bash
# Run all tests (includes coverage report)
npm test

# Run in watch mode
npm run test:watch

# Type-check without building
npm run type-check

# Lint check
npm run lint

# Auto-fix lint issues
npm run lint:fix

# Format code
npm run format
```

The test suite has **7 suites / 58 tests** with **100% coverage** across all files:

| Suite | What it covers |
|---|---|
| `Email.spec.ts` | Domain entity validation |
| `SendEmailUseCase.spec.ts` | Success, provider failure, retry, validation |
| `SendEmailUseCase.parseError.spec.ts` | Non-ZodError propagation from schema.parse |
| `EmailController.spec.ts` | HTTP status codes, JSON responses, error sanitization |
| `DatabaseLogRepository.spec.ts` | SQL query, value ordering, non-fatal DB failures |
| `ValidationError.spec.ts` | Default fieldErrors, constructor |
| `toErrorMessage.spec.ts` | Error, string, and unknown value branches |

---

## Database Schema

```sql
CREATE TABLE IF NOT EXISTS email_logs (
  id              UUID         PRIMARY KEY,
  provider        VARCHAR(20)  NOT NULL,      -- 'sendgrid' | 'aws' | 'brevo'
  recipient_email VARCHAR(255) NOT NULL,
  status          VARCHAR(10)  NOT NULL,      -- 'SUCCESS' | 'ERROR'
  error_reason    TEXT,                       -- NULL on success
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Useful indexes for analytics queries
CREATE INDEX idx_email_logs_provider   ON email_logs (provider);
CREATE INDEX idx_email_logs_status     ON email_logs (status);
CREATE INDEX idx_email_logs_created_at ON email_logs (created_at DESC);
```

---

## Adding a New Provider

Adding a new email provider (e.g. Mailgun) requires changes in **4 places only**:

### 1. Add the provider name to the domain type

**`src/domain/entities/LogRecord.ts`**
```typescript
// Before
export type EmailProvider = 'sendgrid' | 'aws' | 'brevo';

// After
export type EmailProvider = 'sendgrid' | 'aws' | 'brevo' | 'mailgun';
```

### 2. Add the API key to env.ts

**`src/infrastructure/config/env.ts`**
```typescript
// Inside loadEnv():
mailgunApiKey: requireEnv('MAILGUN_API_KEY'),
```

### 3. Create the provider implementation

**`src/infrastructure/providers/MailgunProvider.ts`**
```typescript
import { IEmailProvider } from '../../application/ports/IEmailProvider';
import { Email } from '../../domain/entities/Email';
import { ProviderError } from '../../domain/errors/ProviderError';
import { toErrorMessage } from '../utils/toErrorMessage';

export class MailgunProvider implements IEmailProvider {
  constructor(private readonly apiKey: string) {
    // initialize SDK with apiKey
  }

  async send(email: Email): Promise<void> {
    try {
      // call SDK here
    } catch (err) {
      console.error('[MailgunProvider] Send failed:', toErrorMessage(err));
      throw new ProviderError('mailgun', 'Failed to send email via Mailgun');
    }
  }
}
```

### 4. Wire the new route in the router

**`src/infrastructure/http/router.ts`**
```typescript
import { MailgunProvider } from '../providers/MailgunProvider';

// Inside buildRouter(env):
const mailgunProvider = new MailgunProvider(env.mailgunApiKey);
const mailgunUseCase = new SendEmailUseCase(mailgunProvider, logRepository, 'mailgun');
const mailgunController = new EmailController(mailgunUseCase);
router.post('/send/mailgun', (req, res) => mailgunController.handle(req, res));
```

That's it. The use case, retry logic, controller, logging, and error handling all work automatically.

---

## Environment Variables

| Variable | Description | Required | Default |
|---|---|---|---|
| `PORT` | HTTP server port | No | `3000` |
| `NODE_ENV` | Environment (`development`/`production`) | No | `development` |
| `SENDGRID_API_KEY` | SendGrid API key | Yes | — |
| `AWS_REGION` | AWS region for SES | Yes | — |
| `AWS_ACCESS_KEY_ID` | AWS access key (via environment or IAM role) | Yes* | — |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key (via environment or IAM role) | Yes* | — |
| `BREVO_API_KEY` | Brevo API key | Yes | — |
| `DATABASE_URL` | PostgreSQL connection string | Yes | — |
| `DB_POOL_MAX` | Max connections in the pg pool | No | `10` |
| `DB_IDLE_TIMEOUT_MS` | Idle connection timeout (ms) | No | `30000` |
| `DB_CONNECTION_TIMEOUT_MS` | Connection acquisition timeout (ms) | No | `2000` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit time window (ms) | No | `60000` |
| `RATE_LIMIT_MAX` | Max requests per window per IP | No | `20` |
| `CORS_ORIGIN` | Allowed CORS origin | No | `*` |
| `PAYLOAD_LIMIT` | Max request body size | No | `256kb` |
| `SHUTDOWN_TIMEOUT_MS` | Graceful shutdown force-exit timeout (ms) | No | `30000` |

> \* AWS credentials can also be provided via IAM role, instance profile, or `~/.aws/credentials` — no env vars needed in those cases.
