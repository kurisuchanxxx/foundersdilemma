// End-to-end check of the engagement features: founder avatars, the logo studio, a team of
// three founders, the founder network tab, the round recap and the leaderboard podium.
// Usage: node tests/e2e/engagement.mjs [baseUrl] [outDir]
import { chromium } from "playwright";
import fs from "node:fs";

const base = process.argv[2] ?? "http://localhost:1420/";
const out = process.argv[3] ?? "test-results/engagement";
fs.mkdirSync(out, { recursive: true });

const localChromium = "/opt/pw-browsers/chromium";
const executablePath = process.env.CHROME_PATH ?? (fs.existsSync(localChromium) ? localChromium : undefined);
const browser = await chromium.launch({ executablePath });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (m) => {
  if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errors.push(`console: ${m.text()}`);
});
const shot = (name) => page.screenshot({ path: `${out}/${name}.png`, fullPage: false });
const click = (text) => page.getByRole("button", { name: text }).first().click();
const nav = (label) => page.locator(".sidebar nav").getByRole("button", { name: label }).click();

let failed = false;
try {
  await page.goto(base);
  // the launch intro: rocket and curtain, then the home menu
  await page.waitForSelector("[data-testid=intro]", { timeout: 5000 });
  await page.waitForTimeout(900);
  await shot("00-intro");
  await page.waitForSelector("[data-testid=intro]", { state: "detached", timeout: 8000 });
  await page.waitForSelector("text=Founder's Dilemma");
  await page.waitForTimeout(1600);
  await shot("00-home");
  await page.getByRole("radio", { name: "Italiano" }).click();
  await click(/Nuova partita/);
  await click(/Configura i team/);
  await page.fill("input >> nth=0", "Aurora Labs");

  // founders: name, avatar builder, a second and third founder
  await page.getByPlaceholder("Nome").first().fill("Ada");
  await page.getByRole("button", { name: /Avatar o foto/ }).first().click();
  await page.waitForSelector(".avatar-builder");
  await click(/Sorprendimi/);
  await page.locator(".trait-pick").nth(3).click();
  await page.waitForTimeout(300);
  await shot("01-avatar-builder");
  // drop a generated picture: the cropper opens, zoom it, confirm, the preview shows the photo
  await page.locator(".avatar-builder .dropzone").evaluate((el) => {
    const c = document.createElement("canvas");
    c.width = 320;
    c.height = 200;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#d95926";
    ctx.fillRect(0, 0, 320, 200);
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(160, 100, 60, 0, Math.PI * 2);
    ctx.fill();
    return new Promise((resolve) =>
      c.toBlob((blob) => {
        const dt = new DataTransfer();
        dt.items.add(new File([blob], "face.png", { type: "image/png" }));
        el.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: dt }));
        resolve();
      }, "image/png"),
    );
  });
  await page.waitForSelector("[data-testid=cropper]");
  await page.locator("[data-testid=cropper] input[type=range]").fill("180");
  await page.waitForTimeout(200);
  await shot("01b-cropper");
  await click(/Usa questa foto/);
  await page.waitForSelector(".avatar-preview-ring img");
  await click(/Regola ritaglio/);
  await page.waitForSelector("[data-testid=cropper]");
  await click(/Annulla/);
  await page.waitForSelector(".avatar-preview-ring img");
  await click(/Usa questo avatar/);
  await click(/Aggiungi un co-fondatore/);
  await click(/Aggiungi un altro fondatore/);
  const founderCards = page.locator(".founder-card");
  if ((await founderCards.count()) !== 3) throw new Error("Expected three founder cards");
  await page.getByPlaceholder("Nome").nth(1).fill("Bruno");
  await page.getByPlaceholder("Nome").nth(2).fill("Chiara");
  await page.waitForTimeout(400);
  await founderCards.first().scrollIntoViewIfNeeded();
  await shot("02-founders");

  // logo studio: gallery, composer, custom colour
  await page.getByRole("tab", { name: /Galleria/ }).click();
  await page.locator(".logo-tile").nth(4).click();
  await page.locator(".logo-gallery").scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await shot("03-logo-gallery");
  await page.getByRole("tab", { name: /Studio/ }).click();
  await page.waitForSelector(".logo-composer");
  await click(/Aggiungi un pezzo/);
  await page.locator(".shape-pick").nth(7).click();
  await page.locator(".logo-composer").scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await shot("04-logo-studio");
  await page.getByRole("tab", { name: /Icone/ }).click();
  await page.getByRole("tab", { name: /Galleria/ }).click();
  await page.locator(".logo-tile").nth(0).click();

  await click(/Riepilogo/);
  await page.waitForTimeout(300);
  await shot("05-review");
  await click(/Inizia la partita/);
  await page.waitForSelector("text=Cruscotto");
  await page.waitForSelector(".coach");
  for (let i = 0; i < 30 && (await page.locator(".coach").count()); i++) {
    await page.locator(".coach").getByRole("button", { name: /Avanti|Inizia a giocare/ }).click();
    await page.waitForTimeout(150);
  }
  await nav("Cruscotto");
  await page.waitForTimeout(400);
  await shot("06-dashboard");

  // founder network: a shout-out and a mentorship
  await nav("Decisioni");
  await page.getByRole("tab", { name: /Rete dei fondatori/ }).click();
  await page.waitForSelector(".interaction-card");
  await page.locator(".interaction-card").nth(0).getByRole("button", { name: /Shout-out/ }).click();
  await page.locator(".interaction-card").nth(1).getByRole("button", { name: /Mentorship/ }).click();
  const chosen = await page.locator(".interaction-card .btn.on").count();
  if (chosen !== 2) throw new Error(`Expected two chosen interactions, got ${chosen}`);
  await shot("07-network");
  await page.getByRole("tab", { name: /Riepilogo e invio/ }).click();
  await page.waitForSelector("text=Rete dei fondatori");
  await click(/Invia le decisioni/);
  await click(/Avanza al periodo successivo/);
  await page.waitForSelector(".modal");
  await page.waitForTimeout(2200);
  await shot("08-round-recap");
  if (!(await page.locator(".modal").locator("text=XP guadagnati").count())) throw new Error("The round recap did not show XP");
  await page.getByRole("button", { name: /^Continua$/ }).click();

  await nav("News e reputazione");
  await page.waitForTimeout(300);
  if (!(await page.locator(".feed-row").count())) throw new Error("The founder buzz feed is empty after a shout-out");
  await shot("09-news-buzz");
  await nav("Classifica");
  await page.waitForTimeout(1800);
  await shot("10-leaderboard");
  await nav("Team e assunzioni");
  await page.waitForTimeout(300);
  await shot("11-team");
} catch (e) {
  failed = true;
  console.log(`FAILED: ${String(e).split("\n")[0]}`);
  await shot("zz-failure").catch(() => {});
}
console.log(errors.length ? `ERRORS:\n${errors.join("\n")}` : "No browser errors");
await browser.close();
process.exit(failed || errors.length ? 1 : 0);
