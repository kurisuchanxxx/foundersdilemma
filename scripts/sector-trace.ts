// Runs one game with N bots all in the same sector and prints trajectories.
// Usage: npx vite-node scripts/sector-trace.ts consumer [seed]
import { advanceRound, createGame, defaultConfig, startGame } from "../src/core";
import type { CompanySetup, SectorId } from "../src/core";
import { botSetups } from "../src/core/engine/setup";
import { createRng } from "../src/core/rng";

const sector = (process.argv[2] ?? "consumer") as SectorId;
const seed = process.argv[3] ?? "SEC-1";
const setups: CompanySetup[] = botSetups(3, [], createRng(seed)).map((s, i) => ({ ...s, sector, name: `${sector}-${s.botStyle}-${i}` }));
const state = createGame({ ...defaultConfig(), seed }, setups, 0);
startGame(state);
while (!state.finished) advanceRound(state);
const k = (v: number) => (Math.abs(v) >= 1e6 ? `${(v / 1e6).toFixed(2)}M` : Math.abs(v) >= 1e3 ? `${(v / 1e3).toFixed(1)}k` : v.toFixed(1));
for (const c of state.companies) {
  console.log(`\n== ${c.name} (${c.founders.map((f) => f.archetype).join("+")}) status=${c.status} fit=${c.fitPotential}`);
  console.log("R  cash     mrr      cust     new     churn  price   cac     ltv     pmf  q    debt  team burn    val      mkt     nps");
  for (const h of c.history) {
    console.log([String(h.round).padEnd(2), k(h.cash).padEnd(8), k(h.mrr).padEnd(8), k(h.customers).padEnd(8), k(h.newCustomers).padEnd(7), (h.churn * 100).toFixed(1).padEnd(6), k(h.price).padEnd(7), k(h.cac).padEnd(7), k(h.ltv).padEnd(7), h.pmf.toFixed(0).padEnd(4), h.quality.toFixed(2).padEnd(4), h.techDebt.toFixed(2).padEnd(5), String(h.headcount).padEnd(4), k(h.netBurn).padEnd(7), k(h.valuation).padEnd(8), k(h.marketingSpend).padEnd(7), h.nps.toFixed(0)].join(" "));
  }
}
