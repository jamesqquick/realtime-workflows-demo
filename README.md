# Real-time workflow demo

A React app for tracking background jobs with Cloudflare Workflows, Durable Objects, RPC, and WebSockets.

## Branches

| Branch | Contents |
| --- | --- |
| `main` | Runnable starter: form submission, job links, progress rendering, WebSocket connection management, and a Worker health endpoint. Backend endpoints return `501`; the progress message handler is left for the exercise. |
| `solution` | Finished app: Workflow execution, per-job progress storage and WebSocket broadcasts, snapshot replay, and browser reconnection. |

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

Both branches run from the repository root. On `solution`, start a job, refresh the page, or open its job link in another tab to follow the same job.

## What's supplied in the starter

`app/App.tsx` handles form submission, request errors, the `jobId` URL parameter, browser history, stage rendering, and the reconnect button.

`app/use-job-progress.ts` opens and cleans up the WebSocket, tracks its connection state, and reconnects to the same job. The Connect the browser exercise adds `socket.onmessage` at the marked location to apply progress snapshots and handle terminal states. Until that handler is implemented, an open socket does not advance the progress bar.

The course builds the Workflow and Durable Object backend first. On a fresh clone, clicking Start workflow sends a real request to the unimplemented endpoint and displays an error. Once the job endpoint is implemented, submitting the form saves its job ID in the URL. Refreshing or sharing that URL subscribes to the existing job without creating another one.

## Checks

```bash
pnpm typecheck
pnpm lint
pnpm build
pnpm test
pnpm exec playwright install chromium
pnpm test:browser
```

Tests run against a local Worker runtime. Browser tests on `main` cover request errors and use test doubles for job creation and WebSocket connections to check job links, history, reconnects, and mobile layout. The `solution` tests cover real completion, refresh, a second tab, and the failure display.

## Deployment

`pnpm deploy` deploys the checked-out branch using its `cloudflare.config.ts`. The finished app needs a Cloudflare account with access to Workers, Workflows, and Durable Objects.

The demo has no authentication. Anyone with a job URL can view that job's progress.
