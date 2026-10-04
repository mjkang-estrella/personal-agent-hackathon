// Live check: Stagehand v4 on a Kernel browser with the Neon gateway model.
// Uses a public test form; never submits it.
import Kernel from "@onkernel/sdk";
import { attachStagehand } from "../lib/browser/stagehand";

const kernel = new Kernel({ apiKey: process.env.KERNEL_API_KEY });
const session = await kernel.browsers.create({
  timeout_seconds: 300,
  stealth: false,
});
const t = Date.now();
const lap = (label: string) =>
  console.log(`${label} +${((Date.now() - t) / 1000).toFixed(1)}s`);
try {
  const { stagehand, browser } = await attachStagehand(kernel, session, [
    "httpbin.org",
  ]);
  lap("attached");
  const page =
    (await browser.context.activePage()) ?? (await browser.context.newPage());
  await page.goto("https://httpbin.org/forms/post");
  lap("loaded " + (await page.title()));
  let action: unknown = {
    selector: "xpath=//input[@name='custname']",
    description: "Customer name field",
    method: "fill",
    arguments: ["Ada Test"],
  };
  try {
    const observed = await stagehand.observe(
      "Type 'Ada Test' into the customer name field",
    );
    lap("observed");
    console.log(JSON.stringify(observed, null, 1).slice(0, 1500));
    action = (observed as { data?: unknown[] }).data?.[0] ?? action;
  } catch (e) {
    console.log(
      "observe unavailable (model):",
      (e as Error).message.slice(0, 100),
    );
  }
  const acted = await stagehand.act(action as never);
  lap("acted (replay, no model)");
  console.log(JSON.stringify(acted).slice(0, 500));
  const value = await page.locator("input[name=custname]").inputValue?.();
  console.log("field value:", value);
  try {
    await page.goto("https://example.com/");
    const url = await page.url();
    console.log(
      url.startsWith("chrome-error:")
        ? "domain policy enforced: navigation blocked"
        : "domain policy NOT enforced: " + url,
    );
  } catch (e) {
    console.log("domain policy enforced:", (e as Error).message.slice(0, 120));
  }
  await stagehand.close();
} finally {
  await kernel.browsers.deleteByID(session.session_id);
  lap("browser deleted");
}
