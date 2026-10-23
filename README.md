# Métrix — Game Balance Lab

A local-first balance lab for game designers. Import your catalog of cards, champions, units or weapons and find clones, off-curve entities, coverage gaps and duel outcomes. Your data never leaves your browser.

A professional game development solution by TreyNet Codes.

## Repository layout

| Path | Contents |
| --- | --- |
| `packages/core` | Analysis engine. Pure TypeScript, no DOM. Fully covered by tests. |
| `packages/core/fixtures` | Reference cases (input + expected output) shared with future engine ports. |
| `apps/web` | Web app: React 18 + Vite. |

## Requirements

- Node.js 20 or later
- pnpm 10 (`corepack enable` picks the version pinned in `package.json`)

## Commands

```bash
pnpm install     # install dependencies
pnpm dev         # start the web app in development mode
pnpm lint        # ESLint
pnpm typecheck   # TypeScript in every package
pnpm test        # engine tests with coverage (100% required)
pnpm build       # production build of the web app
pnpm check       # everything above, as run in CI
```

## Branches

- `prod`: default branch. Every push deploys to GitHub Pages.
- `dev`: day-to-day work. Changes reach `prod` once verified.

## CSV format

```csv
id,name,category,cost,hp,atk:physical,atk:magic,def:physical,def:magic,rate,tag:role
guardian,Stone Guardian,champion,4800,680,55,0,48,40,0.65,tank
```

- `id` and `name` are required. Ids must be unique and contain no spaces.
- `atk:<channel>` and `def:<channel>` define damage channels. A channel without a `def:` column deals true damage.
- `rate` is attacks per second or per turn (default 1). `tag:<key>` columns hold text tags.
- Any other fully numeric column is kept as an extra stat.
- The delimiter (`,`, `;` or tab) is detected automatically. With `;`, decimal commas such as `0,65` are accepted.
