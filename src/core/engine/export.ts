import { SECTORS } from "../data/sectors";
import type { Lang } from "../text";
import type { GameState } from "../types";
import { roundLabel } from "./periods";
import { standings } from "./scoring";

function csvCell(v: string | number | null | undefined, lang: Lang): string {
  if (v === null || v === undefined) return "";
  let s = typeof v === "number" ? (Number.isInteger(v) ? String(v) : v.toFixed(4).replace(/\.?0+$/, "")) : v;
  if (typeof v === "number" && lang === "it") s = s.replace(".", ",");
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * CSV as spreadsheets expect it in each language: "," and "." in English, ";" and "," in Italian (what Excel
 * uses with Italian regional settings). The byte-order mark makes Excel read accents and symbols as UTF-8.
 */
function toCsv(rows: Array<Array<string | number | null | undefined>>, lang: Lang): string {
  const sep = lang === "it" ? ";" : ",";
  return "\uFEFF" + rows.map((r) => r.map((v) => csvCell(v, lang)).join(sep)).join("\n") + "\n";
}

const money = (v: number) => Math.round(v);
const price = (v: number) => Math.round(v * 100) / 100;

/** One row per company per round: the dataset instructors use for grading and debriefs. */
export function historyCsv(state: GameState, lang: Lang = "en"): string {
  const header = [
    "session", "seed", "company", "team_members", "bot", "sector", "round", "period", "status", "cash", "mrr", "customers",
    "new_customers", "churned_customers", "monthly_churn", "price", "cac", "ltv", "ltv_cac", "revenue_round", "expenses_round",
    "net_burn_monthly", "runway_months", "valuation", "founder_ownership", "pmf_score", "quality", "tech_debt", "mvp_progress",
    "headcount", "morale", "founder_stress", "nps", "reputation", "brand", "debt", "total_raised",
  ];
  const rows: Array<Array<string | number | null>> = [header];
  for (const c of state.companies) {
    for (const h of c.history) {
      rows.push([
        state.config.sessionName, state.config.seed, c.name, c.teamMembers.join(" / "), c.isBot ? 1 : 0, SECTORS[c.sector].name[lang],
        h.round, roundLabel(state.config, h.round)[lang], c.status, money(h.cash), money(h.mrr), Math.round(h.customers), Math.round(h.newCustomers), Math.round(h.churnedCustomers),
        h.churn, price(h.price), money(h.cac), money(h.ltv), h.cac > 0 ? h.ltv / h.cac : null, money(h.revenue), money(h.expenses), money(h.netBurn), Math.min(999, h.runway),
        money(h.valuation), h.founderOwnership, h.pmf, h.quality, h.techDebt, h.mvpProgress, h.headcount, h.morale, h.stress, h.nps,
        h.reputation, h.brand, money(h.debt), money(h.totalRaised),
      ]);
    }
  }
  return toCsv(rows, lang);
}

/** Final ranking with the most relevant outcome indicators. */
export function standingsCsv(state: GameState, lang: Lang = "en"): string {
  const rows: Array<Array<string | number | null>> = [[
    "rank", "company", "team_members", "bot", "sector", "status", "score", "founder_wealth", "valuation", "founder_ownership",
    "founder_voting", "board_control", "king", "customers", "mrr", "cash", "achievements", "dilemmas",
  ]];
  for (const s of standings(state)) {
    const c = state.companies.find((x) => x.id === s.companyId)!;
    rows.push([
      s.rank, c.name, c.teamMembers.join(" / "), c.isBot ? 1 : 0, SECTORS[c.sector].name[lang], c.status, s.score, money(s.founderWealth),
      money(s.valuation), s.ownership, s.voting, s.boardControl ? 1 : 0, s.king ? 1 : 0, Math.round(s.customers), money(s.mrr), money(s.cash),
      c.achievements.map((a) => a.id).join(" "),
      c.dilemmaHistory.map((d) => `${d.templateId}:${d.chosen}`).join(" "),
    ]);
  }
  return toCsv(rows, lang);
}

/** Decisions taken by each team (useful to discuss strategies in class). */
export function decisionsCsv(state: GameState, lang: Lang = "en"): string {
  const rows: Array<Array<string | number | null>> = [[
    "company", "round", "rd_budget", "marketing_budget", "ops_budget", "price", "gtm", "dev_approach", "discovery", "tech_debt_action",
    "launch_now", "founder_hours", "reputation_action", "offers", "fires", "pitches", "grant", "loan", "dilemma_choice", "accepted_acquisition", "interactions",
    "target_segment", "pricing_model", "partnership_proposals", "accepted_partnerships", "acquisition_bid",
  ]];
  const nameOf = (id: string) => state.companies.find((o) => o.id === id)?.name ?? id;
  for (const c of state.companies) {
    for (const r of state.reports.filter((x) => x.companyId === c.id && x.decision)) {
      const d = r.decision!;
      rows.push([
        c.name, r.round, money(d.rdBudget), money(d.marketingBudget), money(d.opsBudget), price(d.price), d.gtm, d.devApproach, d.discovery, d.techDebtAction,
        d.launchNow ? 1 : 0, d.founderHours, d.reputationAction, d.offers.length, d.fires.length,
        d.pitches.map((p) => `${p.investorId}:${Math.round(p.amount)}@${Math.round(p.valuation)}`).join(" "),
        d.grantApplication, d.loanRequest ? `${d.loanRequest.lenderId}:${Math.round(d.loanRequest.amount)}` : null,
        d.dilemmaChoice, d.acceptAcquisitionId ? 1 : 0,
        (d.interactions ?? []).map((i) => `${i.kind}:${nameOf(i.targetId)}`).join(" "),
        d.targetSegment ?? null, d.pricingModel ?? null,
        (d.partnershipProposals ?? []).map(nameOf).join(" "), (d.acceptPartnershipIds ?? []).length,
        d.acquisitionBid ? `${nameOf(d.acquisitionBid.targetId)}:${Math.round(d.acquisitionBid.amount)}` : null,
      ]);
    }
  }
  return toCsv(rows, lang);
}
