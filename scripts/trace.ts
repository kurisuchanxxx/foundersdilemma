// Prints the round-by-round trajectory of every company in one bot game.
// Usage: npx vite-node scripts/trace.ts [seed] [companies]
import { advanceRound, createGame, defaultConfig, startGame } from "../src/core";

const seed = process.argv[2] ?? "TRACE-1";
const n = Number(process.argv[3] ?? 6);
const state = createGame({ ...defaultConfig(), seed }, [], n);
startGame(state);
while (!state.finished) advanceRound(state);
const k = (v: number) => (Math.abs(v) >= 1e6 ? `${(v / 1e6).toFixed(2)}M` : Math.abs(v) >= 1e3 ? `${(v / 1e3).toFixed(1)}k` : v.toFixed(1));
for (const c of state.companies) {
  console.log(`\n== ${c.name} (${c.sector}, ${c.botStyle}, ${c.founders.map((f) => f.archetype).join("+")}) status=${c.status}`);
  console.log("R  cash     mrr      cust     new     churn  price   cac     ltv     pmf  q    debt  mvp  team burn    val      own");
  for (const h of c.history) {
    console.log(
      [String(h.round).padEnd(2), k(h.cash).padEnd(8), k(h.mrr).padEnd(8), k(h.customers).padEnd(8), k(h.newCustomers).padEnd(7), (h.churn * 100).toFixed(1).padEnd(6), k(h.price).padEnd(7), k(h.cac).padEnd(7), k(h.ltv).padEnd(7), h.pmf.toFixed(0).padEnd(4), h.quality.toFixed(2).padEnd(4), h.techDebt.toFixed(2).padEnd(5), h.mvpProgress.toFixed(2).padEnd(4), String(h.headcount).padEnd(4), k(h.netBurn).padEnd(7), k(h.valuation).padEnd(8), (h.founderOwnership * 100).toFixed(0)].join(" "),
    );
  }
  const reports = state.reports.filter((r) => r.companyId === c.id);
  for (const r of reports) {
    for (const p of r.pitchResults) console.log(`   R${r.round} pitch ${p.investorName}: ${p.outcome} ${k(p.amount)} @ ${k(p.valuation)} (fair ${k(p.fairValuation)})`);
  }
}
