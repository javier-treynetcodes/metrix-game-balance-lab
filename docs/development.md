# Development guide

Technical guide for working on Métrix. For what the tool does and how to use it, see the [README](../README.md).

## Repository layout

| Path | Contents |
| --- | --- |
| `packages/core` | Analysis engine. Pure TypeScript, no DOM. Fully covered by tests. |
| `packages/core/fixtures` | Reference cases (input + expected output) shared with future engine ports. |
| `apps/web` | Web app: React 18 + Vite. |
| `docs` | Documentation. |

## Requirements

- Node.js 20 or later (npm is included; no other package manager is needed)

## Commands

```bash
npm install         # install dependencies for every workspace
npm run dev         # start the web app at http://localhost:5173/metrix-game-balance-lab/
npm run lint        # ESLint
npm run typecheck   # TypeScript in every package
npm test            # engine tests with coverage (100% required)
npm run build       # production build of the web app
npm run check       # everything above, as run in CI
```

## Branches

- `prod`: default branch. Every push deploys the web app to GitHub Pages.
- `dev`: day-to-day work. Changes reach `prod` once verified.

## Continuous integration

`.github/workflows/ci.yml` runs lint, type check, tests and build on every push and pull request. `.github/workflows/deploy.yml` builds `apps/web` and publishes it to GitHub Pages on every push to `prod`.

## Engine rules

- Domain types live in `packages/core/src/types.ts`; the engine has no side effects.
- Every function in `core` has tests, and coverage below 100% fails the build.
- Any change to a formula adds or updates a fixture in `packages/core/fixtures`.
- The CSV template (`packages/core/src/csv/template.ts`) must always import without issues; a test enforces it.
