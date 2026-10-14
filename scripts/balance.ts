// Monte Carlo balancing: runs many bot-only games and prints outcome distributions.
// Usage: npm run balance -- [games=60] [companies=6]
import { SECTOR_IDS, SECTORS } from "../src/core/data/sectors";
import { PMF_THRESHOLD, advanceRound, createGame, defaultConfig, startGame, standings } from "../src/core";
import type { Company, GameState } from "../src/core";

const games = Number(process.argv[2] ?? 60);
const companies = Number(process.argv[3] ?? 6);

interface Row {
  sector: string;
  style: string;
  status: string;
  valuation: number;
  wealth: number;
  mrr: number;
  customers: number;
  pmf: number;
  launchRound: number | null;
  raised: number;
  ownership: number;
  bankruptRound: number | null;
  headcount: number;
  rescues: number;
  pmfRound: number | null;
}

function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = xs.slice().sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}
function pctl(xs: number[], p: number): number {
  if (xs.length === 0) return 0;
  const s = xs.slice().sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(s.length * p))];
}
const fmt = (v: number) => (Math.abs(v) >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : Math.abs(v) >= 1e3 ? `${(v / 1e3).toFixed(0)}k` : v.toFixed(0));

const rows: Row[] = [];
const t0 = Date.now();
for (let g = 0; g < games; g++) {
  const config = { ...defaultConfig(), seed: `BAL-${g}` };
  const state: GameState = createGame(config, [], companies);
  startGame(state);
  while (!state.finished) advanceRound(state);
  const st = standings(state);
  for (const c of state.companies as Company[]) {
    const s = st.find((x) => x.companyId === c.id)!;
    const pmfSnap = c.history.find((h) => h.pmf >= PMF_THRESHOLD);
    rows.push({
      sector: c.sector,
      style: c.botStyle ?? "-",
      status: c.status,
      valuation: s.valuation,
      wealth: s.founderWealth,
      mrr: c.mrr,
      customers: c.customers,
      pmf: c.pmf.score,
      launchRound: c.product.launchRound,
      raised: c.totalRaised,
      ownership: s.ownership,
      bankruptRound: c.bankruptRound,
      headcount: c.team.length,
      rescues: c.rescues,
      pmfRound: pmfSnap ? pmfSnap.round : null,
    });
  }
}
console.log(`Simulated ${games} games x ${companies} companies in ${((Date.now() - t0) / 1000).toFixed(1)}s\n`);

function report(label: string, rs: Row[]) {
  const n = rs.length;
  if (n === 0) return;
  const bankrupt = rs.filter((r) => r.status === "bankrupt").length;
  const exited = rs.filter((r) => r.status === "exited").length;
  const launched = rs.filter((r) => r.launchRound !== null);
  const pmf = rs.filter((r) => r.pmfRound !== null);
  console.log(
    `${label.padEnd(12)} n=${String(n).padStart(4)} bankrupt=${((bankrupt / n) * 100).toFixed(0).padStart(3)}% exit=${((exited / n) * 100).toFixed(0).padStart(3)}% rescued=${((rs.filter((r) => r.rescues > 0).length / n) * 100).toFixed(0).padStart(3)}% ` +
      `launch=${((launched.length / n) * 100).toFixed(0).padStart(3)}% (med R${median(launched.map((r) => r.launchRound!))}) pmf=${((pmf.length / n) * 100).toFixed(0).padStart(3)}% ` +
      `val med=${fmt(median(rs.map((r) => r.valuation))).padStart(6)} p90=${fmt(pctl(rs.map((r) => r.valuation), 0.9)).padStart(6)} ` +
      `wealth med=${fmt(median(rs.map((r) => r.wealth))).padStart(6)} mrr med=${fmt(median(rs.map((r) => r.mrr))).padStart(6)} ` +
      `raised med=${fmt(median(rs.map((r) => r.raised))).padStart(6)} own=${(median(rs.map((r) => r.ownership)) * 100).toFixed(0)}% team=${median(rs.map((r) => r.headcount))} pmfScore=${median(rs.map((r) => r.pmf)).toFixed(0)}`,
  );
}

report("ALL", rows);
console.log("");
for (const s of SECTOR_IDS) report(SECTORS[s].id, rows.filter((r) => r.sector === s));
console.log("");
for (const st of ["lean", "steady", "blitz"]) report(st, rows.filter((r) => r.style === st));
const bk = rows.filter((r) => r.bankruptRound !== null).map((r) => r.bankruptRound!);
console.log(`\nBankruptcy rounds: ${JSON.stringify(Object.fromEntries([...new Set(bk)].sort((a, b) => a - b).map((r) => [r, bk.filter((x) => x === r).length])))}`);
