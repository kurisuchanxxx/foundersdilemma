// End-to-end smoke test: plays a full solo game in a real browser and takes screenshots.
// Usage: node tests/e2e/smoke.mjs [baseUrl] [outDir]
import { chromium } from "playwright";
import fs from "node:fs";

const base = process.argv[2] ?? "http://localhost:1420/";
const out = process.argv[3] ?? "test-results/screens";
fs.mkdirSync(out, { recursive: true });

// Uses CHROME_PATH, the preinstalled sandbox Chromium, or Playwright's own browser (CI).
const localChromium = "/opt/pw-browsers/chromium";
const executablePath = process.env.CHROME_PATH ?? (fs.existsSync(localChromium) ? localChromium : undefined);
const browser = await chromium.launch({ executablePath });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(`console: ${m.text()}`);
});
const shot = (name) => page.screenshot({ path: `${out}/${name}.png`, fullPage: false });
const click = (text) => page.getByRole("button", { name: text }).first().click();

let failed = false;
try {
await page.goto(base);
await page.waitForSelector("text=Founder's Dilemma");
await page.getByRole("radio", { name: "Italiano" }).click();
await shot("01-home");
await click(/Nuova partita/);
await shot("02-setup");
await click(/Configura i team/);
await page.fill("input >> nth=0", "Aurora Labs");
await shot("03-team");
await click(/Riepilogo/);
await click(/Inizia la partita/);
await page.waitForSelector("text=Cruscotto");
await shot("04-dashboard");

const views = [
  ["Decisioni", "05-decisions"],
  ["Team e assunzioni", "06-team"],
  ["Finanziamenti", "07-funding"],
  ["Prodotto e PMF", "08-product"],
  ["Mercato", "09-market"],
  ["News e reputazione", "10-news"],
  ["Classifica", "11-leaderboard"],
  ["Impara", "12-learn"],
];
for (const [label, name] of views) {
  await page.locator(".sidebar nav").getByRole("button", { name: label }).click();
  await page.waitForTimeout(300);
  await shot(name);
}

// play all rounds with default decisions
for (let r = 0; r < 12; r++) {
  const ff = page.getByRole("button", { name: /Simula fino alla fine/ });
  if (await ff.count()) {
    await ff.first().click();
    break;
  }
  await page.locator(".sidebar nav").getByRole("button", { name: "Decisioni" }).click().catch(() => {});
  const finished = await page.locator("text=Risultati finali e debriefing").count();
  if (finished) break;
  await page.getByRole("tab", { name: /Riepilogo e invio/ }).click();
  await page.getByRole("button", { name: /Invia le decisioni/ }).click();
  await page.getByRole("button", { name: /Avanza al periodo successivo/ }).first().click();
  await page.waitForSelector(".modal");
  await page.waitForTimeout(400);
  if (r === 0) await shot("13-round-report");
  await page.getByRole("button", { name: /^Continua$/ }).click().catch(() => {});
  if (await page.locator("text=Vedi i risultati finali").count()) {
    await click(/Vedi i risultati finali/);
    break;
  }
  const done = await page.locator(".sidebar nav").getByRole("button", { name: "Risultati finali" }).count();
  if (done) break;
}
await page.locator(".sidebar nav").getByRole("button", { name: "Risultati finali" }).click();
await page.waitForTimeout(500);
await shot("14-results");
await page.locator(".sidebar nav").getByRole("button", { name: "Cruscotto" }).click();
await page.waitForTimeout(300);
await shot("15-dashboard-end");

} catch (e) {
  failed = true;
  console.log(`FAILED: ${String(e).split("\n")[0]}`);
  await shot("zz-failure").catch(() => {});
}
console.log(errors.length ? `ERRORS:\n${errors.join("\n")}` : "No browser errors");
await browser.close();
process.exit(failed || errors.length ? 1 : 0);
