// End-to-end test of classroom mode: an instructor and two teams on separate "computers"
// (browser contexts) exchange game and decision files for two rounds, in English.
// Then a short hot-seat game checks the pass-the-device privacy screen.
// Usage: node tests/e2e/classroom.mjs [baseUrl] [outDir]
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const base = process.argv[2] ?? "http://localhost:1420/";
const out = process.argv[3] ?? "test-results/classroom";
fs.mkdirSync(out, { recursive: true });

// Uses CHROME_PATH, the preinstalled sandbox Chromium, or Playwright's own browser (CI).
const localChromium = "/opt/pw-browsers/chromium";
const executablePath = process.env.CHROME_PATH ?? (fs.existsSync(localChromium) ? localChromium : undefined);
const browser = await chromium.launch({ executablePath });
const errors = [];

async function newPage(name) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`${name} pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`${name} console: ${m.text()}`);
  });
  await page.goto(base);
  await page.waitForSelector("text=Founder's Dilemma");
  await page.getByRole("radio", { name: "English" }).click();
  return page;
}

const btn = (page, name) => page.getByRole("button", { name }).first();
const nav = (page, name) => page.locator(".sidebar nav").getByRole("button", { name }).click();

async function download(page, trigger, file) {
  const [dl] = await Promise.all([page.waitForEvent("download"), trigger()]);
  const target = path.join(out, file ?? dl.suggestedFilename());
  await dl.saveAs(target);
  return target;
}

async function upload(page, trigger, files) {
  const [chooser] = await Promise.all([page.waitForEvent("filechooser"), trigger()]);
  await chooser.setFiles(files);
}

async function teamRound(name, gameFile) {
  const page = await newPage(name);
  await btn(page, /Join a class/).click();
  await upload(page, () => btn(page, /Open the game file/).click(), gameFile);
  await page.getByRole("button", { name: new RegExp(name) }).first().click();
  await page.waitForSelector("text=Dashboard");
  await nav(page, "Decisions");
  await page.getByRole("tab", { name: /Review & submit/ }).click();
  const decisionFile = await download(page, () => btn(page, /Lock and export the decision file/).click());
  await page.screenshot({ path: `${out}/team-${name.replace(/\W+/g, "_")}-locked.png` });
  return { page, decisionFile };
}

let failed = false;
try {
  // Instructor creates a classroom game with two teams and one bot.
  const host = await newPage("host");
  await btn(host, /New game/).click();
  await host.getByText("Classroom (files)").click();
  await host.screenshot({ path: `${out}/01-setup-classroom.png` });
  // classroom defaults to 6 human teams: bring the slider down to 2
  const slider = host.locator("input[type=range]").first();
  await slider.focus();
  for (let i = 0; i < 4; i++) await host.keyboard.press("ArrowLeft");
  await btn(host, /Configure teams/).click();
  await host.locator("input.input").first().fill("Team Alpha");
  await btn(host, /Next team/).click();
  await host.locator("input.input").first().fill("Team Beta");
  await host.getByText("Fintech").first().click();
  await btn(host, /^Review/).click();
  await host.screenshot({ path: `${out}/02-review.png` });
  await btn(host, /Start the game/).click();
  await host.waitForSelector("text=Instructor console");
  await host.screenshot({ path: `${out}/03-instructor.png` });

  for (let round = 1; round <= 2; round++) {
    await nav(host, "Instructor console");
    const gameFile = await download(host, () => btn(host, /Export game file for teams/).click(), `game_round${round}.fdgame.json`);
    const alpha = await teamRound("Team Alpha", gameFile);
    const beta = await teamRound("Team Beta", gameFile);
    await upload(host, () => btn(host, /Import decision files/).click(), [alpha.decisionFile, beta.decisionFile]);
    await host.waitForSelector("text=Decisions imported.");
    await host.screenshot({ path: `${out}/04-imported-r${round}.png` });
    const imported = await host.locator("text=Decisions imported.").count();
    if (imported !== 2) throw new Error(`Expected 2 imported decision files, got ${imported}`);
    await btn(host, /Advance round/).click();
    await host.waitForSelector(".modal");
    await host.screenshot({ path: `${out}/05-host-report-r${round}.png` });
    await btn(host, /^Continue$/).click().catch(() => {});

    // Team Alpha imports the updated game and sees its round report.
    const updated = await download(host, async () => {
      await nav(host, "Instructor console");
      await btn(host, /Export game file for teams/).click();
    }, `game_round${round + 1}.fdgame.json`);
    await nav(alpha.page, "Settings & save");
    await upload(alpha.page, () => btn(alpha.page, /Import updated game from instructor/).click(), updated);
    await alpha.page.waitForSelector(".modal");
    await alpha.page.screenshot({ path: `${out}/06-team-report-r${round}.png` });
    await alpha.page.context().close();
    await beta.page.context().close();
  }

  // Wrong-round file is rejected.
  const stale = path.join(out, "game_round1.fdgame.json");
  const late = await teamRound("Team Beta", stale);
  await upload(host, () => btn(host, /Import decision files/).click(), [late.decisionFile]);
  await host.waitForSelector("text=It is for round 1");
  await late.page.context().close();

  // Hot-seat: privacy screen before each team's data.
  const hs = await newPage("hotseat");
  await btn(hs, /New game/).click();
  await hs.getByText("Hot-seat (one computer)").click();
  await btn(hs, /Configure teams/).click();
  await hs.locator("input.input").first().fill("Red");
  await btn(hs, /Next team/).click();
  await hs.locator("input.input").first().fill("Blue");
  await btn(hs, /Next team|^Review/).click();
  while (await btn(hs, /Next team/).count()) await btn(hs, /Next team/).click();
  await btn(hs, /^Review/).click().catch(() => {});
  await btn(hs, /Start the game/).click();
  await hs.waitForSelector("text=Instructor console");
  await nav(hs, "Dashboard");
  await hs.waitForSelector("text=Pass the computer to Red");
  await hs.screenshot({ path: `${out}/07-hotseat-pass.png` });
  await btn(hs, /We are Red/).click();
  await hs.waitForSelector("text=Take this round's decisions").catch(() => {});
  await hs.screenshot({ path: `${out}/08-hotseat-red.png` });
  // switching team hides the data again until the next team opens it
  await hs.locator(".sidebar-head .card.selectable").click();
  await hs.locator(".sidebar-head").getByRole("button", { name: /Blue/ }).click();
  await hs.waitForSelector("text=Pass the computer to Blue");

  // Advanced complexity: the exit waterfall simulator appears in Funding.
  const adv = await newPage("advanced");
  await btn(adv, /New game/).click();
  await adv.getByText("Advanced", { exact: true }).click();
  await btn(adv, /Configure teams/).click();
  await adv.locator("input.input").first().fill("Deep Waters");
  await btn(adv, /^Review/).click();
  await btn(adv, /Start the game/).click();
  await nav(adv, "Funding");
  await adv.waitForSelector("text=Exit waterfall simulator");
  await adv.getByRole("radio", { name: /2×/ }).click();
  await adv.locator("text=Exit waterfall simulator").scrollIntoViewIfNeeded();
  await adv.screenshot({ path: `${out}/09-advanced-waterfall.png` });
} catch (e) {
  failed = true;
  console.error("E2E failure:", e);
}

await browser.close();
if (errors.length) {
  console.error("Browser errors:\n" + errors.join("\n"));
  process.exit(1);
}
if (failed) process.exit(1);
console.log("Classroom, hot-seat and advanced flows OK");
