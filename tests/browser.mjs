import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { chromium } from "playwright";
import { startApp } from "./helpers.mjs";

let app;
let browser;
before(async () => {
  app = await startApp();
  browser = await chromium.launch();
});
after(async () => {
  await browser?.close();
  await app?.stop();
});

test("starter renders and keeps its progress at zero", async (t) => {
  const page = await browser.newPage();
  t.after(() => page.close());
  await page.goto(app.origin);
  await page.getByRole("button", { name: "Start workflow" }).click();
  await page
    .getByRole("status")
    .filter({ hasText: "The interface is ready" })
    .waitFor();
  assert.equal(await page.locator("progress").getAttribute("value"), "0");
  assert.equal(
    await page.getByText("Not connected", { exact: true }).isVisible(),
    true,
  );
});
