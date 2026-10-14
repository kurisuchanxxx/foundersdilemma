// A self-contained HTML report of one team's game: numbers, charts, decisions round by round,
// funding, dilemmas and post-mortem prompts. It opens in any browser and prints to PDF.
import { ACHIEVEMENTS, GTM_INFO, PMF_THRESHOLD, SECTORS, roundLabel, standings, type Company, type GameState, type Lang, type Snapshot } from "../../core";
import { saveTextFile } from "../../platform/files";
import { instrumentLabel } from "../content/labels";
import { makeFmt, type Fmt } from "../i18n";

const esc = (s: string): string => s.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!);

interface ChartSpec {
  title: string;
  points: Array<{ x: number; y: number }>;
  format: (v: number) => string;
  threshold?: { value: number; label: string };
  yMax?: number;
}

/** A small single-series line chart as inline SVG, light theme, labels in text ink. */
function lineChart(spec: ChartSpec): string {
  const W = 340;
  const H = 170;
  const pad = { l: 64, r: 14, t: 14, b: 28 };
  const pts = spec.points;
  if (pts.length === 0) return `<figure class="chart"><figcaption>${esc(spec.title)}</figcaption><p class="muted">—</p></figure>`;
  const ys = pts.map((p) => p.y).concat(spec.threshold ? [spec.threshold.value] : []);
  const lo = Math.min(0, ...ys);
  const hi = Math.max(spec.yMax ?? 0, ...ys, lo + 1);
  const xMin = pts[0].x;
  const xMax = Math.max(pts[pts.length - 1].x, xMin + 1);
  const sx = (x: number) => pad.l + ((x - xMin) / (xMax - xMin)) * (W - pad.l - pad.r);
  const sy = (y: number) => pad.t + (1 - (y - lo) / (hi - lo)) * (H - pad.t - pad.b);
  const ticks = [lo, lo + (hi - lo) / 2, hi];
  const path = pts.map((p, i) => `${i ? "L" : "M"}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join("");
  const area = `${path}L${sx(pts[pts.length - 1].x).toFixed(1)},${sy(lo).toFixed(1)}L${sx(pts[0].x).toFixed(1)},${sy(lo).toFixed(1)}Z`;
  const last = pts[pts.length - 1];
  const xLabels = pts.filter((_, i) => pts.length <= 8 || i % 2 === 0 || i === pts.length - 1);
  return `<figure class="chart"><figcaption>${esc(spec.title)}</figcaption>
<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${esc(spec.title)}">
${ticks.map((t) => `<line x1="${pad.l}" x2="${W - pad.r}" y1="${sy(t).toFixed(1)}" y2="${sy(t).toFixed(1)}" stroke="#E3E7EE" stroke-width="1"/><text x="${pad.l - 8}" y="${(sy(t) + 4).toFixed(1)}" text-anchor="end" class="tick">${esc(spec.format(t))}</text>`).join("")}
${xLabels.map((p) => `<text x="${sx(p.x).toFixed(1)}" y="${H - 8}" text-anchor="middle" class="tick">R${p.x}</text>`).join("")}
${spec.threshold ? `<line x1="${pad.l}" x2="${W - pad.r}" y1="${sy(spec.threshold.value).toFixed(1)}" y2="${sy(spec.threshold.value).toFixed(1)}" stroke="#C2410C" stroke-width="1.5" stroke-dasharray="5 4"/><text x="${W - pad.r}" y="${(sy(spec.threshold.value) - 5).toFixed(1)}" text-anchor="end" class="tick" fill="#9A3412">${esc(spec.threshold.label)}</text>` : ""}
<path d="${area}" fill="#2563EB" fill-opacity="0.08"/>
<path d="${path}" fill="none" stroke="#2563EB" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
<circle cx="${sx(last.x).toFixed(1)}" cy="${sy(last.y).toFixed(1)}" r="4" fill="#2563EB" stroke="#FFFFFF" stroke-width="2"/>
</svg></figure>`;
}

function table(head: string[], rows: string[][], numeric: boolean[] = []): string {
  return `<table><thead><tr>${head.map((h, i) => `<th${numeric[i] ? ' class="num"' : ""}>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows
    .map((r) => `<tr>${r.map((c, i) => `<td${numeric[i] ? ' class="num"' : ""}>${c}</td>`).join("")}</tr>`)
    .join("")}</tbody></table>`;
}

function decisionNotes(f: Fmt, game: GameState, c: Company, round: number): string {
  const notes: string[] = [];
  const report = game.reports.find((r) => r.companyId === c.id && r.round === round);
  for (const h of report?.hiringResults ?? []) if (h.outcome === "hired") notes.push(f.tx(`hired ${h.candidateName}`, `assunto ${h.candidateName}`));
  for (const p of report?.pitchResults ?? []) {
    const outcome = p.outcome === "closed" ? f.tx("closed", "chiuso") : p.outcome === "termSheet" ? f.tx("term sheet", "term sheet") : f.tx("rejected", "rifiutato");
    notes.push(`${f.tx("pitch to", "pitch a")} ${p.investorName}: ${outcome}`);
  }
  for (const r of c.fundingHistory.filter((x) => x.round === round)) notes.push(`${r.investorName} ${f.money(r.amount)}`);
  const d = c.dilemmaHistory.find((x) => x.round === round);
  if (d) notes.push(`${f.tx("dilemma", "dilemma")}: ${f.L(d.options.find((o) => o.id === d.chosen)?.label) || "—"}`);
  return notes.map(esc).join("<br>") || '<span class="muted">—</span>';
}

export function teamReportHtml(game: GameState, c: Company, lang: Lang): string {
  const f = makeFmt(lang, game.config.currency);
  const rows = standings(game);
  const row = rows.find((r) => r.companyId === c.id);
  const hist: Snapshot[] = c.history;
  const last = hist[hist.length - 1];
  const sector = SECTORS[c.sector];
  const pmfRound = hist.find((h) => h.pmf >= PMF_THRESHOLD)?.round;
  const firstMoney = c.fundingHistory.find((x) => x.instrument !== "loan");
  const status = c.status === "exited" ? f.tx("Sold", "Venduta") : c.status === "bankrupt" ? f.tx("Bankrupt", "Fallita") : game.finished ? f.tx("Active at the end", "Attiva a fine partita") : f.tx("Game in progress", "Partita in corso");
  const people = c.teamMembers.filter(Boolean).join(", ") || c.founders.map((x) => x.name).join(", ");
  const period = (r: number) => f.L(roundLabel(game.config, r));

  const summary: Array<[string, string, string?]> = [
    [f.tx("Final position", "Posizione"), row ? `${row.rank} / ${rows.length}` : "—", game.finished ? undefined : f.tx("provisional", "provvisoria")],
    [f.tx("Founders' wealth", "Ricchezza dei fondatori"), f.money(row?.founderWealth ?? 0), f.tx("after dilution and preferences", "dopo diluizione e preferenze")],
    [f.tx("Valuation", "Valutazione"), f.money(c.status === "exited" && c.exit ? c.exit.value : c.valuation)],
    [f.tx("Founders' votes", "Voti dei fondatori"), f.pct(row?.voting ?? 0), row?.king ? f.tx("they control the board: King", "controllano il CdA: Re") : f.tx("they do not control the board", "non controllano il CdA")],
    [f.tx("Monthly revenue", "Fatturato mensile"), f.money(last?.mrr ?? 0)],
    [f.tx("Customers", "Clienti"), f.compact(last?.customers ?? 0)],
    ["Product-market fit", `${Math.round(c.pmf.score)}`, pmfRound ? f.tx(`reached in round ${pmfRound}`, `raggiunto al round ${pmfRound}`) : f.tx("never reached 60", "mai arrivato a 60")],
    [f.tx("Total raised", "Totale raccolto"), f.money(c.totalRaised), `${c.fundingHistory.length} ${f.tx("operations", "operazioni")}`],
  ];

  const milestones: string[] = [
    `${f.tx("Launch", "Lancio")}: ${c.product.launchRound ? `${f.tx("round", "round")} ${c.product.launchRound}` : f.tx("never launched", "mai lanciato")}`,
    `Product-market fit: ${pmfRound ? `${f.tx("round", "round")} ${pmfRound}` : f.tx("not reached", "non raggiunto")}`,
    `${f.tx("First external money", "Primi capitali esterni")}: ${firstMoney ? `${firstMoney.investorName}, ${f.tx("round", "round")} ${firstMoney.round}` : f.tx("none (bootstrapped)", "nessuno (bootstrapping)")}`,
  ];
  if (c.exit) milestones.push(f.tx(`Exit: sold to ${c.exit.acquirer} in round ${c.exit.round} for ${f.money(c.exit.value)}; founders received ${f.money(c.exit.founderPayout)}`, `Exit: venduta a ${c.exit.acquirer} al round ${c.exit.round} per ${f.money(c.exit.value)}; i fondatori hanno incassato ${f.money(c.exit.founderPayout)}`));
  if (c.status === "bankrupt") milestones.push(`${f.tx("Bankruptcy", "Fallimento")}: ${f.tx("round", "round")} ${c.bankruptRound ?? "—"}. ${f.L(c.bankruptReason)}`);

  const charts = [
    lineChart({ title: f.tx("Monthly revenue (MRR)", "Fatturato mensile (MRR)"), points: hist.map((h) => ({ x: h.round, y: h.mrr })), format: (v) => f.money(v) }),
    lineChart({ title: f.tx("Cash at the end of the round", "Cassa a fine round"), points: hist.map((h) => ({ x: h.round, y: h.cash })), format: (v) => f.money(v) }),
    lineChart({ title: "Product-market fit", points: hist.map((h) => ({ x: h.round, y: h.pmf })), format: (v) => f.num(v), threshold: { value: PMF_THRESHOLD, label: f.tx("PMF threshold 60", "soglia PMF 60") }, yMax: 100 }),
    lineChart({ title: f.tx("Founders' ownership", "Quota dei fondatori"), points: hist.map((h) => ({ x: h.round, y: h.founderOwnership })), format: (v) => f.pct(v), yMax: 1 }),
  ].join("");

  const timeline = table(
    [f.tx("Period", "Periodo"), f.tx("Cash", "Cassa"), "MRR", f.tx("Customers", "Clienti"), "PMF", f.tx("Net burn/mo", "Burn netto/mese"), "Runway", f.tx("Valuation", "Valutazione"), f.tx("Founders", "Fondatori")],
    hist.map((h) => [esc(period(h.round)), f.money(h.cash), f.money(h.mrr), f.compact(h.customers), f.num(h.pmf), f.money(h.netBurn), esc(f.months(h.runway)), f.money(h.valuation), f.pct(h.founderOwnership)]),
    [false, true, true, true, true, true, true, true, true],
  );

  const dev = { rush: f.tx("fast", "veloce"), balanced: f.tx("balanced", "bilanciato"), quality: f.tx("quality", "qualità") } as const;
  const disc = { none: f.tx("none", "nessuna"), light: f.tx("light", "leggera"), deep: f.tx("deep", "profonda") } as const;
  const myReports = game.reports.filter((r) => r.companyId === c.id && r.decision).sort((a, b) => a.round - b.round);
  const decisions = table(
    [f.tx("Period", "Periodo"), f.tx("Price", "Prezzo"), f.tx("R&D / Mkt / Ops per month", "R&S / Mkt / Ops al mese"), f.tx("Channel", "Canale"), f.tx("Product", "Prodotto"), f.tx("Hours", "Ore"), f.tx("Hires, funding, dilemmas", "Assunzioni, capitali, dilemmi")],
    myReports.map((r) => {
      const d = r.decision!;
      return [
        esc(period(r.round)),
        f.money(d.price, { decimals: d.price < 100 ? 2 : 0 }),
        `${f.money(d.rdBudget)} / ${f.money(d.marketingBudget)} / ${f.money(d.opsBudget)}`,
        esc(f.L(GTM_INFO[d.gtm].name)),
        esc(`${dev[d.devApproach]}, discovery ${disc[d.discovery]}`),
        `${d.founderHours}h`,
        decisionNotes(f, game, c, r.round),
      ];
    }),
    [false, true, true, false, false, true, false],
  );

  const funding =
    c.fundingHistory.length === 0
      ? `<p class="muted">${esc(f.tx("No external funding: the company was bootstrapped.", "Nessun finanziamento esterno: l'azienda è cresciuta in bootstrapping."))}</p>`
      : table(
          [f.tx("Round", "Round"), f.tx("From", "Da"), f.tx("Instrument", "Strumento"), f.tx("Amount", "Importo"), "Pre-money", f.tx("Stake", "Quota"), f.tx("Board seat", "Seggio CdA")],
          c.fundingHistory.map((r) => [String(r.round), esc(r.investorName), esc(instrumentLabel(f, r.instrument)), f.money(r.amount), r.preMoney ? f.money(r.preMoney) : "—", r.equityPct ? f.pct(r.equityPct, 1) : "—", r.boardSeat ? f.tx("yes", "sì") : "—"]),
          [true, false, false, true, true, true, false],
        );

  const dilemmas =
    c.dilemmaHistory.length === 0
      ? `<p class="muted">${esc(f.tx("No founder's dilemma in this game.", "Nessun dilemma del fondatore in questa partita."))}</p>`
      : `<ul class="list">${c.dilemmaHistory
          .map((d) => `<li><b>R${d.round} · ${esc(f.L(d.title))}</b><br>${esc(f.tx("Choice", "Scelta"))}: ${esc(f.L(d.options.find((o) => o.id === d.chosen)?.label) || "—")}${d.outcome ? `<br><span class="muted">${esc(f.L(d.outcome))}</span>` : ""}</li>`)
          .join("")}</ul>`;

  const achievements =
    c.achievements.length === 0
      ? `<p class="muted">—</p>`
      : `<ul class="list">${c.achievements
          .map((a) => {
            const def = ACHIEVEMENTS.find((x) => x.id === a.id);
            return def ? `<li><b>${esc(f.L(def.name))}</b> (R${a.round}): ${esc(f.L(def.description))}</li>` : "";
          })
          .join("")}</ul>`;

  const seen = new Set<string>();
  const warnings = game.reports
    .filter((r) => r.companyId === c.id)
    .flatMap((r) => r.insights.filter((i) => i.severity === "warn" || i.severity === "critical").map((i) => ({ round: r.round, text: f.L(i.text) })))
    .filter((i) => (seen.has(i.text) ? false : (seen.add(i.text), true)))
    .slice(0, 8);
  const mentor = warnings.length === 0 ? `<p class="muted">—</p>` : `<ul class="list">${warnings.map((w) => `<li>R${w.round}: ${esc(w.text)}</li>`).join("")}</ul>`;

  const prompts = [
    f.tx("The three decisions that shaped the game, and the alternatives you had.", "Le tre decisioni che hanno segnato la partita, e le alternative che avevate."),
    f.tx("When did you reach (or miss) product-market fit, and why?", "Quando avete raggiunto (o mancato) il product-market fit, e perché?"),
    f.tx("Was every funding round worth its dilution? Rich, king, or neither?", "Ogni round di finanziamento valeva la sua diluizione? Ricchi, re, o nessuno dei due?"),
    f.tx("What would you do differently in the first three rounds?", "Cosa fareste diversamente nei primi tre round?"),
    f.tx("A real company whose story resembles yours, and where the game simplifies reality.", "Un'azienda reale con una storia simile alla vostra, e dove il gioco semplifica la realtà."),
  ];

  const title = `${c.name} · ${f.tx("Team report", "Report del team")}`;
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>
:root { --ink: #111827; --ink-2: #4B5563; --line: #E3E7EE; --soft: #F4F6FA; --accent: #2563EB; color-scheme: light; }
* { box-sizing: border-box; }
body { margin: 0; background: #FFFFFF; color: var(--ink); font: 14px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
main { max-width: 980px; margin: 0 auto; padding: 40px max(16px, env(safe-area-inset-left, 0px)) 56px; }
header { display: flex; gap: 18px; align-items: center; border-bottom: 2px solid var(--ink); padding-bottom: 18px; }
.logo { width: 56px; height: 56px; border-radius: 14px; display: grid; place-items: center; color: #FFFFFF; font-weight: 700; font-size: 26px; flex: none; }
h1 { margin: 0; font-size: 28px; line-height: 1.15; }
h2 { font-size: 18px; margin: 34px 0 12px; padding-bottom: 6px; border-bottom: 1px solid var(--line); }
.muted { color: var(--ink-2); }
.badge { display: inline-block; padding: 2px 10px; border-radius: 999px; background: var(--soft); border: 1px solid var(--line); font-size: 12px; font-weight: 600; }
.cards { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
.card { border: 1px solid var(--line); border-radius: 10px; padding: 12px 14px; break-inside: avoid; }
.card .label { font-size: 12px; color: var(--ink-2); }
.card .value { font-size: 20px; font-weight: 700; font-variant-numeric: tabular-nums; }
.card .sub { font-size: 12px; color: var(--ink-2); }
.charts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.chart { margin: 0; border: 1px solid var(--line); border-radius: 10px; padding: 10px 12px; break-inside: avoid; }
figcaption { font-weight: 600; margin-bottom: 4px; }
.tick { font-size: 10px; fill: #4B5563; font-variant-numeric: tabular-nums; }
.table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid var(--line); vertical-align: top; }
th { background: var(--soft); font-weight: 600; }
td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
tr { break-inside: avoid; }
.list { margin: 0; padding-left: 18px; display: grid; gap: 8px; }
.prompt { border: 1px solid var(--line); border-radius: 10px; padding: 10px 14px 64px; margin-bottom: 10px; break-inside: avoid; }
footer { margin-top: 40px; font-size: 12px; color: var(--ink-2); border-top: 1px solid var(--line); padding-top: 10px; }
@media (max-width: 720px) { .cards { grid-template-columns: repeat(2, minmax(0, 1fr)); } .charts { grid-template-columns: 1fr; } }
@media print { main { padding: 0; } h2 { break-after: avoid; } @page { margin: 16mm; } }
</style>
</head>
<body>
<main>
<header>
<div class="logo" style="background:${esc(c.color)}">${esc(c.name.trim().charAt(0).toUpperCase() || "?")}</div>
<div>
<h1>${esc(c.name)}</h1>
<div class="muted">${esc(f.L(sector.name))} · ${esc(people)}</div>
<div class="muted">${esc(game.config.sessionName || "Founder's Dilemma")} · seed ${esc(game.config.seed)} · <span class="badge">${esc(status)}</span></div>
</div>
</header>

<h2>${esc(f.tx("In short", "In sintesi"))}</h2>
<div class="cards">${summary.map(([l, v, s]) => `<div class="card"><div class="label">${esc(l)}</div><div class="value">${esc(v)}</div>${s ? `<div class="sub">${esc(s)}</div>` : ""}</div>`).join("")}</div>
<ul class="list" style="margin-top:14px">${milestones.map((m) => `<li>${esc(m)}</li>`).join("")}</ul>

<h2>${esc(f.tx("Trends", "Andamento"))}</h2>
<div class="charts">${charts}</div>

<h2>${esc(f.tx("Numbers round by round", "I numeri round per round"))}</h2>
<div class="table-wrap">${timeline}</div>

<h2>${esc(f.tx("Decisions round by round", "Le decisioni round per round"))}</h2>
<div class="table-wrap">${decisions}</div>

<h2>${esc(f.tx("Funding", "Finanziamenti"))}</h2>
<div class="table-wrap">${funding}</div>

<h2>${esc(f.tx("Founder's dilemmas", "Dilemmi del fondatore"))}</h2>
${dilemmas}

<h2>${esc(f.tx("Achievements", "Obiettivi raggiunti"))}</h2>
${achievements}

<h2>${esc(f.tx("What the mentor flagged", "Cosa ha segnalato il mentor"))}</h2>
${mentor}

<h2>${esc(f.tx("Post-mortem", "Post-mortem"))}</h2>
<p class="muted">${esc(f.tx("Answer as a team, with numbers from this report.", "Rispondete come team, usando i numeri di questo report."))}</p>
${prompts.map((p, i) => `<div class="prompt"><b>${i + 1}.</b> ${esc(p)}</div>`).join("")}

<footer>${esc(f.tx("Generated by Founder's Dilemma", "Generato da Founder's Dilemma"))} · ${esc(new Date().toLocaleString(lang === "it" ? "it-IT" : "en-US", { dateStyle: "medium", timeStyle: "short" }))} · ${esc(f.tx("Print or save as PDF from the browser.", "Stampa o salva in PDF dal browser."))}</footer>
</main>
</body>
</html>
`;
}

export function teamReportFileName(c: Company): string {
  return `${c.name.replace(/[^\w-]+/g, "_")}_report.html`;
}

export function downloadTeamReport(game: GameState, c: Company, lang: Lang): Promise<boolean> {
  return saveTextFile(teamReportFileName(c), teamReportHtml(game, c, lang), [{ name: "HTML", extensions: ["html"] }], "text/html");
}
