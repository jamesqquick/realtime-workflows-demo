# Real-time workflow demo

A React app for tracking background jobs with Cloudflare Workflows, Durable Objects, RPC, and WebSockets.

## Branches

| Branch | Contents |
| --- | --- |
| `main` | Runnable starter: React interface and Worker health endpoint. Job creation returns `501`; progress stays at zero. |
| `solution` | Finished app: Workflow execution, per-job progress storage and WebSocket broadcasts, snapshot replay, browser reconnection, and a simulated failure. |

The finished app simulates a background job through four stages: research, outline, draft, and review. The stages simulate work without calling external services. Workflow execution, storage, and progress delivery are real.

## Run locally

Use a Node.js version supported by `package.json` (`^22.23.0 || ^24.22.0 || >=26.12.0`) and pnpm 11.9 or newer. The project pins the cf CLI beta and uses `cloudflare.config.ts`.

```bash
git clone --branch main https://github.com/jamesqquick/realtime-workflows-demo.git
cd realtime-workflows-demo
pnpm install --frozen-lockfile
pnpm dev
```

Open the URL printed by the development server. To run the finished app, stop the server and switch branches from a clean working tree:

```bash
git switch solution
pnpm install --frozen-lockfile
pnpm dev
```

Both branches run from the repository root. On `solution`, start a job, refresh the page, or open its job link in another tab to follow the same job. Select the failure checkbox to stop intentionally at the draft stage.

## Checks

```bash
pnpm typecheck
pnpm lint
pnpm build
pnpm test
pnpm exec playwright install chromium
pnpm test:browser
```

Tests run against a local Worker runtime. Browser tests cover the starter on `main`, and completion, refresh, a second tab, failure, and mobile layout on `solution`.

## Deployment

`pnpm deploy` deploys the checked-out branch using its `cloudflare.config.ts`. The finished app needs a Cloudflare account with access to Workers, Workflows, and Durable Objects.

The demo has no authentication. Anyone with a job URL can view that job's progress.
