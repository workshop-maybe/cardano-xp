# Cardano XP

Builders need feedback. People who care about Cardano need a way to help. Cardano XP connects the two — contributors review apps, courses, and proposals, and earn XP tokens on-chain as permanent proof of work.

XP is a reputation token, not a financial instrument. 100k fixed supply. Tasks are the only mint. You can give XP to others, but your total earned is always recorded. Claim a credential to snapshot your balance permanently on-chain.

## How it works

1. **Pick a task** — browse feedback tasks posted by builders
2. **Give feedback** — try the thing, say what you think
3. **Earn XP on-chain** — contributions are reviewed by a human; accepted work releases XP to your wallet
4. **Build your record** — claim a credential that unlocks new opportunities across projects

## Running locally

```bash
git clone https://github.com/workshop-maybe/cardano-xp.git
cd cardano-xp
npm install
cp .env.example .env
# Fill in ANDAMIO_API_KEY — get one at https://preprod.app.andamio.io/api-setup
npm run dev
```

Requires Node.js 20+. The app connects to Andamio APIs on preprod — no local backend needed.

## Environment

See `.env.example` for all variables. The required ones:

| Variable | What it does |
|----------|-------------|
| `NEXT_PUBLIC_ANDAMIO_GATEWAY_URL` | Andamio API gateway (preprod or mainnet) |
| `ANDAMIO_API_KEY` | Server-side API key for gateway requests |
| `NEXT_PUBLIC_CARDANO_NETWORK` | `preprod` or `mainnet` |
| `NEXT_PUBLIC_COURSE_ID` | The course this app serves |
| `NEXT_PUBLIC_PROJECT_ID` | The project this app serves |
| `NEXT_PUBLIC_XP_POLICY_ID` | XP token policy ID (56-char hex) |

## Scripts

| Script | What it does |
|--------|-------------|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run check` | Lint + typecheck |
| `npm run generate:types` | Regenerate API types from gateway spec |

## Built with

[Next.js](https://nextjs.org) 16 + TypeScript, [Tailwind CSS](https://tailwindcss.com) v4, [Mesh SDK](https://meshjs.dev) for Cardano wallet integration, [Andamio](https://andamio.io) for on-chain course, project, and credential infrastructure.

## Project wallet

`addr_test1qzycl2vtgkq5p9p0eglsfj2ruankazmg9relwg9pa694r6s75lyqaqtvzt5kkvwuz7nnjte9q0dt2wgakqrkvavj5fusvgufhh` (preprod)

All ADA spent building this project is tracked through this wallet.

## Links

- [Tokenomics](docs/tokenomics.md) — XP token design
- [Build journal](journal/) — chronological development record
- [About Andamio](docs/about-andamio.md) — the platform this is built on

## License

MIT
