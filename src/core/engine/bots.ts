import { EXPECTED_EQUITY } from "../data/candidates";
import { INVESTORS, GRANTS, LENDERS } from "../data/investors";
import { SECTORS } from "../data/sectors";
import type { Rng } from "../rng";
import type { BotStyle, Candidate, Company, Decision, GameState, InteractionRequest, Pitch, Role } from "../types";
import { carryOverDecision } from "./decision";
import { defaultOption } from "./dilemmas";
import { fairValuation, grantChecks, investorChecks, loanLimit, monthlyExpenses } from "./finance";
import { askSalary, expectedEquity } from "./hiring";
import { estimateWtp } from "./market";
import { activeFounders, clamp } from "./util";

const STYLE: Record<BotStyle, { runway: number; priceFactor: number; ask: number; salary: number; equity: number; hours: 50 | 60 | 80; acquisitionPremium: number }> = {
  lean: { runway: 15, priceFactor: 1.0, ask: 0.95, salary: 1.0, equity: 1.0, hours: 50, acquisitionPremium: 1.25 },
  steady: { runway: 11, priceFactor: 0.92, ask: 1.05, salary: 1.05, equity: 1.2, hours: 60, acquisitionPremium: 1.45 },
  blitz: { runway: 7, priceFactor: 0.82, ask: 1.2, salary: 1.15, equity: 1.5, hours: 80, acquisitionPremium: 1.8 },
};

export const DILEMMA_CHOICES: Record<string, Record<BotStyle, string>> = {
  big_client_custom: { lean: "decline", steady: "accept", blitz: "accept" },
  poaching: { lean: "equity", steady: "equity", blitz: "counter" },
  cofounder_conflict: { lean: "mediate", steady: "mediate", blitz: "ignore" },
  dark_patterns: { lean: "refuse", steady: "refuse", blitz: "do" },
  data_shortcut: { lean: "consent", steady: "consent", blitz: "shortcut" },
  pivot_or_persevere: { lean: "pivot", steady: "pivot", blitz: "persevere" },
  bridge_offer: { lean: "accept", steady: "accept", blitz: "accept" },
  ceo_replacement: { lean: "accept", steady: "accept", blitz: "fight" },
  remote_or_office: { lean: "remote", steady: "office", blitz: "office" },
  influencer_campaign: { lean: "skip", steady: "skip", blitz: "go" },
  open_source_core: { lean: "closed", steady: "open", blitz: "closed" },
  sustainability: { lean: "green", steady: "green", blitz: "later" },
  founder_burnout: { lean: "rest", steady: "rest", blitz: "push" },
  layoffs: { lean: "layoffs", steady: "paycut", blitz: "keep" },
  acquihire_offer: { lean: "accept", steady: "decline", blitz: "decline" },
  annual_prepay: { lean: "offer", steady: "offer", blitz: "no" },
  inflated_metrics: { lean: "honest", steady: "honest", blitz: "inflate" },
  late_payer: { lean: "negotiate", steady: "accept", blitz: "accept" },
  public_tender: { lean: "skip", steady: "bid", blitz: "skip" },
  ransomware: { lean: "restore", steady: "restore", blitz: "pay" },
  license_gray_zone: { lean: "wait", steady: "partner", blitz: "launch" },
  platform_risk: { lean: "diversify", steady: "absorb", blitz: "passon" },
  pilot_purgatory: { lean: "paid", steady: "paid", blitz: "free" },
  controversial_client: { lean: "policy", steady: "policy", blitz: "accept" },
  star_misconduct: { lean: "investigate", steady: "investigate", blitz: "protect" },
  delaware_flip: { lean: "stay", steady: "flip", blitz: "flip" },
  inventory_moq: { lean: "small", steady: "bulk", blitz: "bulk" },
};

function neededRole(c: Company): Role | null {
  const s = SECTORS[c.sector];
  const founders = activeFounders(c).map((f) => f.archetype);
  const count = (r: Role) => c.team.filter((e) => e.role === r).length;
  const technical = founders.includes("hacker") || count("Engineer") > 0;
  if (!c.product.launched) {
    if (!technical || (s.mvpEffort > 80 && count("Engineer") < 2)) return "Engineer";
    if (count("Engineer") < 2) return "Engineer";
    return null;
  }
  if (s.salesDependence >= 0.4 && count("Sales") < 1 + Math.floor(c.team.length / 6)) return "Sales";
  if (count("Growth") < 1) return "Growth";
  if (count("Engineer") < 2 + Math.floor(c.team.length / 4)) return "Engineer";
  if (c.churn > s.baseChurn * 1.3 && count("CustomerSuccess") < 1) return "CustomerSuccess";
  if (count("Product") < 1 && c.team.length >= 3) return "Product";
  if (count("Designer") < 1 && c.team.length >= 4) return "Designer";
  return null;
}

function pickCandidate(state: GameState, c: Company, role: Role, budget: number, rng: Rng): Candidate | undefined {
  const pool = state.candidates.filter((k) => k.role === role && !k.heldFor && askSalary(state, c, k) <= budget);
  if (pool.length === 0) return undefined;
  const scored = pool
    .map((k) => ({ k, v: Object.values(k.stats).reduce((a, b) => a + b, 0) / (askSalary(state, c, k) / 10_000) + rng.range(0, 0.5) }))
    .sort((a, b) => b.v - a.v);
  return scored[0].k;
}

/** Rule-based decision for bot companies. Deterministic given the rng. */
export function botDecision(state: GameState, c: Company, rng: Rng): Decision {
  const style = STYLE[c.botStyle ?? "steady"];
  const s = SECTORS[c.sector];
  const d = carryOverDecision(c);
  const last = c.history[c.history.length - 1];
  const launched = c.product.launched;

  // Pricing
  d.price = clamp(Math.round(estimateWtp(state, c) * style.priceFactor * 100) / 100, s.priceMin, s.priceMax);
  // Channel
  const fits = (Object.entries(s.gtmFit) as Array<[Decision["gtm"], number]>).filter(([g]) => g !== "salesLed" || s.salesDependence >= 0.3);
  fits.sort((a, b) => a[1] - b[1]);
  d.gtm = c.botStyle === "lean" && launched && fits.some(([g]) => g === "brand") && rng.chance(0.3) ? "brand" : fits[0][0];

  // Product
  d.devApproach = c.botStyle === "blitz" ? "rush" : c.botStyle === "lean" && !launched ? "quality" : "balanced";
  d.discovery = c.botStyle === "lean" ? "deep" : c.botStyle === "steady" ? (launched ? "light" : "deep") : launched ? "none" : "light";
  d.techDebtAction = c.product.techDebt > 0.5 ? "paydown" : c.product.techDebt > 0.3 ? "maintain" : c.botStyle === "blitz" ? "ship" : "maintain";
  // Lean bots polish the MVP, but stop polishing once half of the game has gone by.
  d.launchNow =
    !launched &&
    ((c.botStyle === "blitz" && c.product.mvpProgress >= 0.6) ||
      (c.botStyle === "steady" && c.product.mvpProgress >= 0.85) ||
      (c.botStyle === "lean" && state.round > state.config.totalRounds / 2 && c.product.mvpProgress >= 0.5));
  d.founderHours = c.founderStress > 0.75 ? 50 : style.hours;
  d.vacation = c.founderStress > 0.85;

  // Budgets sized on the target runway; people come first (they are more efficient than contractors).
  const fixed = monthlyExpenses(state, c, { ...d, rdBudget: 0, marketingBudget: 0, opsBudget: 0, discovery: "none" }, state.round).total;
  const gm = s.grossMargin;
  const income = c.mrr * gm;
  const allowance = c.cash / style.runway + income;
  let room = allowance - fixed;

  d.offers = [];
  const role = neededRole(c);
  if (role && room > 6_000) {
    const cand = pickCandidate(state, c, role, (room - 3_000) * 12 * 0.8, rng);
    if (cand) {
      const salary = Math.round((askSalary(state, c, cand) * style.salary) / 500) * 500;
      d.offers.push({ candidateId: cand.id, salary, equityPct: Math.round(expectedEquity(c, cand) * style.equity * 10_000) / 10_000 });
      room -= salary / 12;
      if (c.botStyle === "blitz" && room > 15_000) {
        const cand2 = pickCandidate(state, c, launched ? "Growth" : "Engineer", (room - 5_000) * 12 * 0.6, rng);
        if (cand2 && cand2.id !== cand.id) {
          const s2 = Math.round((askSalary(state, c, cand2) * style.salary) / 500) * 500;
          d.offers.push({ candidateId: cand2.id, salary: s2, equityPct: EXPECTED_EQUITY[cand2.seniority] });
          room -= s2 / 12;
        }
      }
    }
  }
  const spendable = Math.max(1_500, room);
  if (!launched) {
    d.rdBudget = Math.round(Math.max(1_000, spendable * 0.55) / 100) * 100;
    d.marketingBudget = Math.round((spendable * 0.15) / 100) * 100;
    d.opsBudget = Math.round((spendable * 0.05) / 100) * 100;
  } else {
    let mkt = spendable * 0.6;
    if (last && last.ltv > 0 && last.cac > 0 && last.ltv / last.cac < 1) mkt *= 0.6;
    const growth = c.team.filter((e) => e.role === "Growth").reduce((sum, e) => sum + e.stats.growth, 0);
    mkt = Math.min(mkt, (10_000 + growth * 6_000) * 1.3);
    d.rdBudget = Math.round(Math.max(1_000, spendable * 0.2) / 100) * 100;
    d.marketingBudget = Math.round(mkt / 100) * 100;
    d.opsBudget = Math.round(Math.max(300, spendable * 0.08) / 100) * 100;
  }

  // Runway projection with these budgets
  const burn = monthlyExpenses(state, c, d, state.round).total + d.offers.reduce((sum, o) => sum + o.salary / 12, 0) - income;
  const runway = burn > 0 ? c.cash / burn : 999;

  d.acceptCounterIds = c.counterOffers.filter((co) => co.salary / 12 < c.cash / 24).map((co) => co.id);
  if (runway < 4 && c.team.length > 1 && c.botStyle !== "blitz") {
    const worst = c.team
      .filter((e) => e.candidateId !== "pro_ceo")
      .map((e) => ({ e, v: Object.values(e.stats).reduce((a, b) => a + b, 0) / e.salary }))
      .sort((a, b) => a.v - b.v)[0];
    if (worst) d.fires = [worst.e.id];
  }

  // Fundraising
  d.pitches = [];
  d.acceptTermSheetIds = c.termSheets.filter(() => runway < style.runway + 8 || c.botStyle === "blitz").map((t) => t.id);
  const wantsMoney = runway < style.runway + 4 || (c.botStyle === "blitz" && runway < 24);
  if (wantsMoney && c.termSheets.length === 0) {
    const eligible = INVESTORS.filter((inv) => {
      if (inv.type === "crowdfunding" && c.botStyle !== "steady") return false;
      const checks = investorChecks(state, c, inv, d.founderHours);
      return checks.every((ch) => !ch.hard || ch.met);
    }).sort((a, b) => b.checkMax - a.checkMax);
    const maxPitches = c.botStyle === "blitz" ? 2 : 1;
    for (const inv of eligible.slice(0, maxPitches)) {
      const months = c.botStyle === "blitz" ? 24 : c.botStyle === "steady" ? 18 : 12;
      const need = Math.max(inv.checkMin, Math.min(inv.checkMax, Math.max(burn, 8_000) * months));
      const fair = fairValuation(state, c, inv);
      const instrument: Pitch["instrument"] = inv.instruments.includes("safe") && inv.type === "angel" && c.botStyle !== "blitz" ? "safe" : "equity";
      let valuation = Math.round((fair * style.ask) / 10_000) * 10_000;
      if (instrument === "safe") valuation += need;
      const amount = Math.round(need / 5_000) * 5_000;
      // Do not sell more than ~25% in one go
      if (amount / (valuation + amount) > 0.3) valuation = Math.round((amount / 0.25 - amount) / 10_000) * 10_000;
      d.pitches.push({ investorId: inv.id, amount, valuation, instrument });
    }
    if (d.pitches.length === 0 && runway < 9) {
      const grant = GRANTS.find((g) => grantChecks(c, g.id).every((ch) => ch.met));
      if (grant) d.grantApplication = grant.id;
      const lender = LENDERS.find((l) => l.type === "bank" && loanLimit(c, l, state.round).checks.every((ch) => ch.met) && loanLimit(c, l, state.round).max > 20_000);
      if (lender && c.botStyle !== "lean") d.loanRequest = { lenderId: lender.id, amount: loanLimit(c, lender, state.round).max };
    }
  }

  // Reputation & culture
  d.reputationAction = "none";
  if (runway > style.runway && state.round % 2 === 0) d.reputationAction = c.botStyle === "blitz" ? "pr" : c.botStyle === "steady" ? "conference" : "community";
  d.teamOffsite = c.team.length >= 3 && c.morale < 0.55 && runway > 8;

  // Exit
  d.acceptAcquisitionId = null;
  const late = state.round >= state.config.totalRounds - 1;
  for (const o of c.acquisitionOffers) {
    if (o.premium >= style.acquisitionPremium || (late && o.premium >= 1.05 && c.botStyle !== "blitz") || runway < 2.5) {
      d.acceptAcquisitionId = o.id;
      break;
    }
  }

  // Strategy: lean bots start from a beachhead niche and widen after product-market fit
  if (c.botStyle === "lean") d.targetSegment = launched && c.pmf.score >= 65 ? "broad" : "niche";
  else if (c.botStyle === "steady") d.targetSegment = s.salesDependence >= 0.7 ? "premium" : "broad";
  else d.targetSegment = "broad";
  d.pricingModel = c.botStyle === "blitz" && s.virality >= 0.01 ? "freemium" : c.botStyle === "steady" && c.sector === "aiinfra" ? "usage" : "subscription";

  // Other teams: answer partnership proposals, sometimes propose one or bid for a struggling rival
  const others = state.companies.filter((o) => o.id !== c.id && o.status === "active");
  d.acceptPartnershipIds = (c.partnershipOffers ?? []).filter((o) => o.validRound >= state.round && others.some((x) => x.id === o.fromCompanyId) && rng.chance(0.7)).map((o) => o.id);
  d.partnershipProposals = [];
  if (c.botStyle === "steady" && launched && rng.chance(0.15)) {
    const partners = others.filter((o) => o.sector !== c.sector && !(c.partnerships ?? []).some((p) => p.partnerId === o.id && p.untilRound >= state.round));
    if (partners.length > 0) d.partnershipProposals = [rng.pick(partners).id];
  }
  d.acquisitionBid = null;
  if (c.botStyle !== "lean" && launched && runway > 10 && rng.chance(0.25)) {
    // a struggling or weaker company that costs at most half of the cash
    const targets = others.filter((o) => {
      const r = o.history[o.history.length - 1]?.runway ?? 99;
      return o.valuation * 1.1 <= c.cash * 0.6 && (r < 6 || o.pmf.score < c.pmf.score - 10) && (o.sector === c.sector || o.product.quality > c.product.quality);
    });
    if (targets.length > 0) {
      const t = rng.pick(targets);
      d.acquisitionBid = { targetId: t.id, amount: Math.round((t.valuation * rng.range(0.95, 1.25)) / 10_000) * 10_000 };
    }
  }

  // Dilemma
  if (c.dilemma) {
    const choice = DILEMMA_CHOICES[c.dilemma.templateId]?.[c.botStyle ?? "steady"];
    d.dilemmaChoice = choice && c.dilemma.options.some((o) => o.id === choice) ? choice : defaultOption(c.dilemma);
    if (c.dilemma.templateId === "pivot_or_persevere" && c.botStyle === "steady" && c.pmf.score > 35) d.dilemmaChoice = "persevere";
    if (c.dilemma.templateId === "acquihire_offer" && c.botStyle === "lean" && c.pmf.score > 25 && runway > 4) d.dilemmaChoice = "decline";
  }
  return d;
}

/** Bots join the founder network too: blitz bots taunt, steady bots cheer, lean bots mentor. */
export function botInteractions(state: GameState, c: Company, rng: Rng): InteractionRequest[] {
  if (state.round < 2 || !rng.chance(0.35)) return [];
  const others = state.companies.filter((o) => o.id !== c.id && o.status === "active");
  if (others.length === 0) return [];
  const style = c.botStyle ?? "steady";
  if (style === "blitz") {
    const humans = others.filter((o) => !o.isBot);
    return [{ kind: "taunt", targetId: rng.pick(humans.length > 0 ? humans : others).id, employeeId: null }];
  }
  if (style === "lean") {
    const weakest = [...others].sort((a, b) => a.pmf.score - b.pmf.score)[0];
    return [{ kind: "mentorship", targetId: weakest.id, employeeId: null }];
  }
  return [{ kind: "shoutout", targetId: rng.pick(others).id, employeeId: null }];
}
