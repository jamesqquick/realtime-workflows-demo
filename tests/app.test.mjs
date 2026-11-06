import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { startApp } from "./helpers.mjs";

let app;
before(async () => {
  app = await startApp();
});
after(async () => {
  await app?.stop();
});

test("starter serves the React page and a working Worker endpoint", async () => {
  const page = await fetch(app.origin);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /Workflow Lab/);
  const health = await fetch(`${app.origin}/api/health`);
  assert.deepEqual(await health.json(), {
    ok: true,
    project: "workflow-lab-starter",
  });
});

test("starter reports an unimplemented job instead of pretending to run it", async () => {
  const response = await fetch(`${app.origin}/api/jobs`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ prompt: "A demo job" }),
  });
  assert.equal(response.status, 501);
  assert.match((await response.json()).error, /not implemented/);
  const missing = await fetch(`${app.origin}/api/missing`);
  assert.equal(missing.status, 404);
  assert.match(missing.headers.get("content-type"), /application\/json/);
});
