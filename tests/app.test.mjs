import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { startApp } from "./helpers.mjs";

let app;
before(async () => {
  app = await startApp();
});
after(async () => {
  await app?.stop();
});

class ProgressTimeoutError extends Error {
  constructor(messages) {
    super(
      `Timed out waiting for workflow progress: ${JSON.stringify(messages)}`,
    );
    this.name = "ProgressTimeoutError";
  }
}

function watch(jobId) {
  const url = new URL("/api/progress", app.origin);
  url.protocol = "ws:";
  url.searchParams.set("jobId", jobId);
  const socket = new WebSocket(url);
  const messages = [];
  let failed = false;
  socket.addEventListener("message", (event) =>
    messages.push(JSON.parse(event.data)),
  );
  socket.addEventListener("error", () => {
    failed = true;
  });
  return {
    messages,
    close: () => socket.close(),
    async waitFor(predicate, timeout = 25000) {
      const deadline = Date.now() + timeout;
      while (Date.now() < deadline) {
        const message = messages.find(predicate);
        if (message) return message;
        assert.equal(failed, false, "The WebSocket failed to connect");
        await delay(50);
      }
      throw new ProgressTimeoutError(messages);
    },
  };
}

async function start(params) {
  const response = await fetch(`${app.origin}/api/jobs`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(params),
  });
  const body = await response.json();
  assert.equal(response.status, 202, JSON.stringify(body));
  assert.match(body.jobId, /^[\da-f-]{36}$/i);
  return body.jobId;
}

async function waitForWorkflow(jobId, expected) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const response = await fetch(`${app.origin}/api/jobs/${jobId}`);
    assert.equal(response.status, 200);
    const status = await response.json();
    if (status.status === expected) return status;
    await delay(100);
  }
  assert.fail(`Workflow ${jobId} did not reach ${expected}`);
}

test("solution serves health and handles missing or unknown jobs", async () => {
  const health = await fetch(`${app.origin}/api/health`);
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { ok: true });
  assert.equal((await fetch(`${app.origin}/api/jobs`)).status, 404);
  assert.equal((await fetch(`${app.origin}/api/progress`)).status, 400);
  assert.equal(
    (await fetch(`${app.origin}/api/jobs/${randomUUID()}`)).status,
    404,
  );
  assert.equal(
    (await fetch(`${app.origin}/api/progress?jobId=${randomUUID()}`)).status,
    426,
  );
});

test("real workflow broadcasts all stages, isolates jobs, and replays saved progress", {
  timeout: 45000,
}, async (t) => {
  const [jobA, jobB] = await Promise.all([
    start({ prompt: "Job A topic" }),
    start({ prompt: "Job B topic" }),
  ]);
  assert.notEqual(jobA, jobB);
  const first = watch(jobA);
  const second = watch(jobA);
  const other = watch(jobB);
  t.after(() => {
    first.close();
    second.close();
    other.close();
  });

  const initial = await first.waitFor(() => true, 3000);
  assert.equal(initial.jobId, jobA);
  assert.equal(initial.prompt, "Job A topic");
  await first.waitFor((message) => message.completedStages >= 1);
  first.close();
  const refreshed = watch(jobA);
  t.after(() => refreshed.close());
  const replay = await refreshed.waitFor(() => true, 3000);
  assert.ok(
    replay.completedStages >= 1,
    "Reconnecting immediately replays stored progress",
  );

  const [completeA, completeB] = await Promise.all([
    refreshed.waitFor((message) => message.status === "complete"),
    other.waitFor((message) => message.status === "complete"),
    second.waitFor((message) => message.status === "complete"),
  ]);
  assert.equal(completeA.completedStages, 4);
  assert.equal(completeB.completedStages, 4);
  assert.deepEqual(
    second.messages
      .filter((message) => message.status === "running")
      .map((message) => message.stageIndex)
      .filter((value, index, all) => all.indexOf(value) === index),
    [0, 1, 2, 3],
  );
  for (const message of [
    ...first.messages,
    ...second.messages,
    ...refreshed.messages,
  ])
    assert.equal(message.jobId, jobA);
  for (const message of other.messages) assert.equal(message.jobId, jobB);

  const late = watch(jobA);
  t.after(() => late.close());
  assert.equal((await late.waitFor(() => true, 3000)).status, "complete");
  const status = await waitForWorkflow(jobA, "complete");
  assert.equal(status.progress.status, "complete");
});

test("intentional failure is delivered and remains available to late subscribers", {
  timeout: 35000,
}, async (t) => {
  const jobId = await start({ prompt: "Failure case", failAtDraft: true });
  const live = watch(jobId);
  t.after(() => live.close());
  const failed = await live.waitFor((message) => message.status === "failed");
  assert.equal(failed.stageIndex, 2);
  assert.equal(failed.completedStages, 2);
  assert.match(failed.message, /failed on purpose/);
  assert.equal(
    live.messages.some((message) => message.status === "complete"),
    false,
  );
  const late = watch(jobId);
  t.after(() => late.close());
  assert.equal((await late.waitFor(() => true, 3000)).status, "failed");
  const status = await waitForWorkflow(jobId, "errored");
  assert.equal(status.progress.status, "failed");
});
