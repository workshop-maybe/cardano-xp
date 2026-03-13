# Andamio App Template

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![Agent Skills](https://img.shields.io/badge/Agent_Skills-8_skills-8B5CF6)](https://agentskills.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

Forkable Cardano dApp starter built on the Andamio Protocol. Course creation, credential issuance, project management, and treasury operations — all on-chain.

**Built for AI-assisted development.** This repo includes [Agent Skills](https://agentskills.io) that work with Claude Code, Cursor, Copilot, Gemini CLI, and [30+ other coding agents](https://agentskills.io/home). Fork it, open your favorite AI coding tool, and run `/getting-started` to customize your theme in 2 minutes.

## Quick Start

```bash
# Fork this repo, then:
git clone https://github.com/YOUR-USERNAME/andamio-app-template.git
cd andamio-app-template
npm install
cp .env.example .env
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The app connects to Andamio APIs — no local backend needed.

**Requires**: Node.js 20+

## Environment

```bash
NEXT_PUBLIC_ANDAMIO_GATEWAY_URL="https://preprod.api.andamio.io"
ANDAMIO_API_KEY="your-api-key"  # Get from https://app.andamio.io/api-setup
NEXT_PUBLIC_CARDANO_NETWORK="preprod"
```

## Scripts

| Script | What it does |
|--------|-------------|
| `npm run dev` | Dev server with Turbopack |
| `npm run build` | Production build |
| `npm run check` | Lint + typecheck |
| `npm run generate:types` | Regenerate API types from gateway spec |
| `npm run preview` | Build + start locally |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) + TypeScript |
| API | Unified Andamio Gateway (`/api/v2/*`) + tRPC v11 |
| Styling | Tailwind CSS v4 + shadcn/ui + semantic colors |
| Blockchain | Cardano via Mesh SDK |
| Editor | Tiptap with custom extensions |
| Types | Auto-generated from gateway OpenAPI spec |

## Project Structure

```
andamio-app-template/
├── .skills/                    # Agent Skills (works with 30+ coding agents)
│   ├── getting-started/        # Quick onboarding
│   ├── auth/                   # Authentication guide
│   ├── transactions/           # TX state machine
│   └── ...                     # More skills
│
├── src/
│   ├── app/
│   │   ├── (app)/              # Sidebar layout routes
│   │   │   ├── dashboard/      # User dashboard
│   │   │   ├── course/         # Learner course views
│   │   │   ├── studio/         # Creator Studio
│   │   │   └── project/        # Public project views
│   │
│   ├── components/
│   │   ├── andamio/            # Design system components
│   │   ├── auth/               # Auth + RequireAuth wrapper
│   │   ├── editor/             # Tiptap rich text editor
│   │   └── transactions/       # TX components
│   │
│   ├── hooks/                  # Auth, data fetching, TX hooks
│   ├── types/generated/        # Auto-generated API types
│   ├── lib/                    # Gateway client, utilities
│   └── config/                 # TX schemas, UI config
│
├── AGENTS.md                   # AI development rules (works with any agent)
└── .claude/                    # Claude Code specific settings (optional)
```

## Key Patterns

### Authentication

Wallet connect triggers JWT auth automatically. Use `RequireAuth` to gate pages:

```typescript
import { RequireAuth } from "~/components/auth/require-auth";

<RequireAuth title="Studio" description="Connect to access">
  <StudioContent />
</RequireAuth>
```

### API Calls

Types are generated from the gateway spec — never define API types locally:

```typescript
import { type CourseResponse } from "~/types/generated";

const { data, isLoading, error } = useAndamioFetch<CourseResponse[]>({
  endpoint: "/course/owner/courses/list",
  authenticated: true,
});
```

### Styling

Semantic colors only. Never hardcoded Tailwind colors:

```typescript
// correct
<span className="text-success">Done</span>
<span className="text-destructive">Error</span>

// never
<span className="text-green-600">Done</span>
```

### Icons

Always import from the centralized icon system:

```typescript
import { CredentialIcon, CourseIcon } from "~/components/icons";
```

### How Transactions Work

Andamio uses a two-layer state machine for Cardano transactions.

#### Client Layer (User-Facing)

```
idle → fetching → signing → submitting → success
         ↓           ↓           ↓
       error       error       error
```

The `useTransaction` hook manages this:

```typescript
const { execute, state, result } = useTransaction();

await execute({
  txType: "COURSE_STUDENT_ASSIGNMENT_COMMIT",
  params: { course_id, alias, slt_hash, ... }
});
// state: fetching → signing → submitting → success
```

#### Gateway Layer (Background Confirmation)

After submission, the gateway monitors the blockchain:

```
pending → confirmed → updated
            ↓
         failed/expired
```

Track confirmation with `useTxStream`:

```typescript
const { status, isSuccess } = useTxStream(result?.txHash);
// status.state: pending → confirmed → updated
```

#### Key Insight

**"confirmed" is NOT terminal.** The gateway updates the database ~30s after on-chain confirmation. Always wait for `updated` before refetching data:

```typescript
// WRONG - data will be stale
if (status.state === "confirmed") refetchData();

// CORRECT - wait for DB sync
if (status.state === "updated") refetchData();
```

#### The 7-Step Flow

1. **UI Action** → `useTransaction().execute({ txType, params })`
2. **Build** → POST to gateway, receive unsigned CBOR
3. **Sign** → Wallet signs with partial signing enabled
4. **Submit** → Wallet submits to blockchain, returns txHash
5. **Register** → POST `/api/v2/tx/register` starts gateway monitoring
6. **Monitor** → SSE stream (or polling) until terminal state
7. **Complete** → Toast fires, DB updated, UI refreshes

#### Key Files

| File | Purpose |
|------|---------|
| `hooks/tx/use-transaction.ts` | Execute transactions |
| `hooks/tx/use-tx-stream.ts` | SSE-based confirmation tracking |
| `stores/tx-watcher-store.ts` | Persistent TX monitoring |
| `config/transaction-ui.ts` | TX types and endpoints |
| `config/transaction-schemas.ts` | Zod validation |

## Agent Skills

This template includes [Agent Skills](https://agentskills.io) — portable instructions that work with any compatible coding agent.

```
.skills/
├── getting-started/   # Quick onboarding (start here!)
├── auth/              # API keys and JWT authentication
├── transactions/      # Cardano TX state machine
├── tx-challenge/      # 4 progressive TX challenges
├── task-lifecycle/    # Commit → submit → assess flow
├── design-system/     # UI patterns and styling
├── fix/               # AI-assisted bug fixing
└── ship/              # Commit, PR, merge workflow
```

### Get Started

1. Fork this repo
2. Open with your AI coding agent ([Claude Code](https://claude.ai/code), [Cursor](https://cursor.com), [Copilot](https://github.com/features/copilot), [Gemini CLI](https://geminicli.com), or [others](https://agentskills.io/home))
3. Run `/getting-started` — you'll customize the theme and see hot reload in 2 minutes
4. Follow the learning path: `/auth` → `/transactions` → `/tx-challenge`

### Learning Path

| Skill | What you'll learn |
|-------|-------------------|
| `/getting-started` | Quick win: customize theme colors in 2 minutes |
| `/auth` | API keys for devs, JWTs for end users |
| `/transactions` | Cardano TX state machine and hooks |
| `/tx-challenge` | Learn by building — 4 progressive TX challenges |
| `/task-lifecycle` | Hands-on commit → submit → assess on preprod |

### Reference Skills

| Skill | What it does |
|-------|-------------|
| `/design-system` | UI patterns, component reference, styling audits |
| `/fix` | AI-assisted bug fixing |
| `/ship` | Version bump, commit, PR, merge |

### How It Works

Skills follow the open [Agent Skills spec](https://agentskills.io/specification). Each skill is a folder with a `SKILL.md` file containing instructions your AI agent can follow. Instead of reading docs, you learn by doing — your agent guides you through real tasks in your actual codebase.

Project-wide rules live in [`AGENTS.md`](./AGENTS.md) at the repo root.

## Customization

1. **Branding**: Edit `src/config/branding.ts` for app name, logo, colors
2. **Routes**: Add pages under `src/app/(app)/` for sidebar layout
3. **Transactions**: Configure TX schemas in `src/config/transaction-types/`
4. **Styling**: Extend shadcn components, keep semantic colors

## Resources

- [Andamio Platform](https://andamio.io) | [Andamio Docs](https://docs.andamio.io)
- [API Docs](https://docs.andamio.io)
- [T3 Stack](https://create.t3.gg/) | [Next.js](https://nextjs.org/docs)
- [Mesh SDK](https://meshjs.dev) | [shadcn/ui](https://ui.shadcn.com)

## License

MIT
