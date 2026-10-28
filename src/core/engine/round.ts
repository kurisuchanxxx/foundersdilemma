import { SECTORS } from "../data/sectors";
import { createPreviewRng, createRng, type Rng } from "../rng";
import { fill, lt, moneyL } from "../text";
import type { Company, CustomEventSpec, Decision, Employee, Features, GameEvent, GameState, PreviewResult, RoundReport, SectorId, Snapshot } from "../types";
import { checkAchievements, finalAchievements } from "./achievements";
import { botDecision, botInteractions } from "./bots";
import { foundersOwnership } from "./captable";
import type { SimCtx } from "./context";
import { carryOverDecision, oneOffCosts, REPUTATION_ACTIONS, sanitizeDecision } from "./decision";
import { generateDilemma, resolveDilemma, resolvePendingRisks } from "./dilemmas";
import { averageReputation } from "./effects";
import { applyCustomEvent, fireCompanyEvent, generateOutlook, scheduleCompanyEvents } from "./events";
import { acceptAcquisition, generateAcquisitionOffers } from "./exit";
import { acceptPartnerships, completeTeamAcquisition, sendAcquisitionBid, sendPartnershipProposals } from "./deals";
import { acceptTermSheet, allocateDeals, assessPitch, financeMonth, type PitchCandidate, handleInsolvency, monthlyExpenses, payPendingGrants, processGrantApplication, processLoanRequest } from "./finance";
import { evaluateChallenges, generateChallenges, openShowdown, resolveShowdown } from "./gamify";
import { refreshCandidates, resolveHiring } from "./hiring";
import { resolveInteractions } from "./interactions";
import { mentorInsights } from "./insights";
import { brandAndSentiment, convertWaitlist, marketMonth, priceRiseRetention, quote } from "./market";
import { fireEmployee, resignEmployee } from "./people";
import { maybeLaunch, productMonth } from "./product";
import { monthsInRound } from "./periods";
import { rivalMoves } from "./rivals";
import { applyStrategySwitch } from "./strategy";
import { computeCapacities, moraleTarget, resignationChance, stressTarget } from "./team";
import { updateValuation } from "./valuation";
import { clamp, clamp01, effectiveModifiers, featuresFor, headcount, prepaidMonthly } from "./util";

function newReport(round: number, companyId: string): RoundReport {
  return { round, companyId, lines: [], pitchResults: [], hiringResults: [], eventIds: [], insights: [], decision: null };
}

function buildCtx(state: GameState, c: Company, d: Decision, rng: Rng, report: RoundReport, features: Features, preview: boolean): SimCtx {
  const mods = effectiveModifiers(state, c, c.sector, state.round);
  return {
    c,
    d,
    sector: SECTORS[c.sector],
    mods,
    cap: computeCapacities(c, d, state.month, mods.dev, mods.sales),
    features,
    rng,
    report,
    distraction: 0,
    oneOffCosts: 0,
    newCustomers: 0,
    churnedCustomers: 0,
    paidCustomers: 0,
    revenue: 0,
    grossProfit: 0,
    expenses: 0,
    marketingSpent: 0,
    organicShare: 0,
    startMrr: c.mrr,
    startCash: c.cash,
    monthlyExpensesLast: 0,
    scheduledEvents: [],
    launchedThisRound: false,
    preview,
  };
}

// ---------------------------------------------------------------------------------------
// Turn management
// ---------------------------------------------------------------------------------------

/** Lets every bot decide for the current round. */
export function prepareBots(state: GameState): void {
  for (const c of state.companies) {
    if (!c.isBot || c.status !== "active" || c.submitted) continue;
    const rng = createRng(state.config.seed, state.round, "bot", c.id);
    const d = botDecision(state, c, rng);
    d.interactions = botInteractions(state, c, createRng(state.config.seed, state.round, "bot-network", c.id));
    c.decision = sanitizeDecision(state, c, d);
    c.submitted = true;
  }
}

export function submitDecision(state: GameState, companyId: string, decision: Decision): void {
  const c = state.companies.find((x) => x.id === companyId);
  if (!c || c.status !== "active" || state.finished) return;
  c.decision = sanitizeDecision(state, c, decision);
  c.submitted = true;
}

export function saveDraft(state: GameState, companyId: string, decision: Decision): void {
  const c = state.companies.find((x) => x.id === companyId);
  if (!c || c.status !== "active" || state.finished) return;
  c.decision = sanitizeDecision(state, c, decision);
}

export function unsubmitDecision(state: GameState, companyId: string): void {
  const c = state.companies.find((x) => x.id === companyId);
  if (c && !c.isBot) c.submitted = false;
}

export function draftFor(_state: GameState, c: Company): Decision {
  return c.decision ? structuredClone(c.decision) : carryOverDecision(c);
}

export function allHumansSubmitted(state: GameState): boolean {
  return state.companies.filter((c) => !c.isBot && c.status === "active").every((c) => c.submitted);
}

export function injectCustomEvent(state: GameState, spec: CustomEventSpec): GameEvent {
  return applyCustomEvent(state, spec, state.round);
}

// ---------------------------------------------------------------------------------------
// Round simulation
// ---------------------------------------------------------------------------------------

function applyReputationAction(x: SimCtx): void {
  const a = x.d.reputationAction;
  if (a === "none") return;
  const c = x.c;
  x.distraction += REPUTATION_ACTIONS[a].distraction;
  const r = c.reputation;
  if (a === "pr") {
    r.media = clamp(r.media + x.rng.range(6, 14), 0, 100);
    c.brand = clamp01(c.brand + 0.03);
  } else if (a === "conference") {
    r.investors = clamp(r.investors + 6, 0, 100);
    r.talent = clamp(r.talent + 3, 0, 100);
    r.media = clamp(r.media + 2, 0, 100);
  } else if (a === "community") {
    r.customers = clamp(r.customers + 5, 0, 100);
    r.talent = clamp(r.talent + 3, 0, 100);
    c.brand = clamp01(c.brand + 0.02);
  }
}

/** Sets this round's price; customers who no longer find it worth paying leave at once. */
function applyPrice(state: GameState, x: SimCtx, price: number): void {
  const c = x.c;
  if (c.product.launched && c.customers > 0) {
    const kept = priceRiseRetention(state, x, c.price, price);
    if (kept < 1) {
      const lost = c.customers * (1 - kept);
      c.customers -= lost;
      x.churnedCustomers += lost;
      if (!x.preview && lost >= 0.5)
        x.report.lines.push({
          kind: "bad",
          text: fill(lt("The price rise above what customers value made {n} of them cancel right away.", "L'aumento di prezzo oltre il valore percepito ha fatto disdire subito {n} clienti."), { n: Math.round(lost) }),
        });
    }
  }
  c.price = price;
  if (c.product.launched) c.mrr = c.customers * c.price;
}

function lastMonthNet(state: GameState, x: SimCtx, round: number): number {
  const gm = clamp(x.sector.grossMargin + x.mods.gm, 0.05, 0.95);
  const exp = monthlyExpenses(state, x.c, x.d, round, x.cap.traits.burn).total;
  const debt = x.c.loans.reduce((s, l) => s + l.monthlyPayment, 0);
  const revenue = x.c.product.launched ? x.c.mrr : 0;
  // prepaid customers pay nothing this month (as in financeMonth, never more than the revenue itself)
  return revenue * gm - Math.min(prepaidMonthly(x.c), revenue) - exp - debt;
}

function projectedRunway(state: GameState, x: SimCtx, round: number): number {
  const net = lastMonthNet(state, x, round) - x.d.offers.reduce((s, o) => s + o.salary / 12, 0);
  return net >= 0 ? 99 : x.c.cash / -net;
}

function teamMonth(state: GameState, x: SimCtx, month: number, round: number): void {
  const c = x.c;
  const net = lastMonthNet(state, x, round);
  const runway = net >= 0 ? 99 : c.cash / -net;
  const pts = c.monthly;
  const ref = pts.length >= 3 ? pts[pts.length - 3].mrr : pts.length > 0 ? pts[0].mrr : 0;
  const growth = ref > 0 ? c.mrr / ref - 1 : c.mrr > 0 ? 0.3 : 0;
  c.morale = clamp(c.morale + (moraleTarget(c, x.d, runway, growth, x.mods.morale) - c.morale) * 0.25, 0.05, 1);
  // fatigue: grows with every month at 60+ hours, rest and vacations bring it down
  const tired = c.overworkMonths ?? 0;
  c.overworkMonths = x.d.vacation ? 0 : x.d.founderHours >= 60 ? tired + 1 : Math.max(0, tired - 2);
  c.founderStress = clamp01(c.founderStress + (stressTarget(c, x.d, runway, round, x.mods.stress) - c.founderStress) * 0.3);
  if (c.burnoutMonthsLeft > 0) c.burnoutMonthsLeft -= 1;
  c.stressStreak = c.founderStress > 0.85 ? c.stressStreak + 1 : 0;
  if (c.stressStreak >= 2 && c.burnoutMonthsLeft === 0 && !x.preview) {
    c.burnoutMonthsLeft = 3;
    c.founderStress = clamp01(c.founderStress - 0.2);
    c.stressStreak = 0;
    x.report.lines.push({ kind: "bad", text: lt("Founder burnout: for three months the founders work at half speed.", "Burnout del fondatore: per tre mesi i fondatori lavorano a metà velocità.") });
  }
  if (!x.preview) {
    for (const e of [...c.team]) {
      if (e.candidateId === "pro_ceo") continue;
      if (x.rng.chance(resignationChance(c, e, month))) resignEmployee(state, c, e, month, x.report);
    }
  }
}

function reputationDrift(c: Company): void {
  const r = c.reputation;
  r.media += (15 - r.media) * 0.08;
  r.investors += (30 - r.investors) * 0.05;
  const talentTarget = 25 + 45 * c.morale + Math.min(15, c.team.length);
  r.talent += (talentTarget - r.talent) * 0.2;
  for (const k of ["investors", "media", "talent", "customers"] as const) r[k] = clamp(r[k], 0, 100);
}

function makeSnapshot(state: GameState, x: SimCtx, round: number, months: number): Snapshot {
  const c = x.c;
  const net = -lastMonthNet(state, x, round);
  const runway = net <= 0 ? 999 : Math.max(0, c.cash / net);
  const debt = c.loans.reduce((s, l) => s + l.remaining, 0);
  return {
    round,
    month: state.month + months,
    cash: c.cash,
    mrr: c.mrr,
    customers: c.customers,
    newCustomers: x.newCustomers,
    churnedCustomers: x.churnedCustomers,
    churn: c.product.launched ? c.churn : 0,
    cac: c.product.launched ? c.cac : 0,
    ltv: c.product.launched ? c.ltv : 0,
    price: c.price,
    revenue: x.revenue,
    grossProfit: x.grossProfit,
    expenses: x.expenses,
    netBurn: net,
    runway,
    valuation: c.valuation,
    founderOwnership: foundersOwnership(c),
    pmf: c.pmf.score,
    quality: c.product.quality,
    techDebt: c.product.techDebt,
    mvpProgress: c.product.mvpProgress,
    headcount: headcount(c),
    morale: c.morale,
    stress: c.founderStress,
    nps: c.nps,
    reputation: averageReputation(c),
    brand: c.brand,
    debt,
    marketingSpend: x.d.marketingBudget,
    totalRaised: c.totalRaised,
  };
}

function summaryLines(x: SimCtx): void {
  const c = x.c;
  if (c.product.launched) {
    x.report.lines.unshift({
      kind: "info",
      text: fill(
        lt("Revenue this round {r}, {n} new customers, {ch} lost. Monthly revenue now {m}.", "Ricavi del round {r}, {n} nuovi clienti, {ch} persi. Fatturato mensile ora {m}."),
        { r: moneyL(x.revenue), n: Math.round(x.newCustomers), ch: Math.round(x.churnedCustomers), m: moneyL(c.mrr) },
      ),
    });
  } else {
    x.report.lines.unshift({
      kind: "product",
      text: fill(lt("MVP progress: {p}%. Waitlist: {w} people.", "Avanzamento MVP: {p}%. Lista d'attesa: {w} persone."), {
        p: Math.round(c.product.mvpProgress * 100),
        w: Math.round(c.waitlist),
      }),
    });
  }
}

function newDecisionPhase(state: GameState, round: number): void {
  const rng = createRng(state.config.seed, round, "global");
  state.outlook = generateOutlook(state, round, rng);
  if (round > 1) refreshCandidates(state, round, rng);
  for (const id of Object.keys(state.markets) as SectorId[]) {
    const m = state.markets[id];
    m.hype = clamp(m.hype + rng.normal(0, 0.04), 0.8, 1.25);
  }
  state.outlook.push(...rivalMoves(state, round, createRng(state.config.seed, round, "rivals")));
  for (const c of state.companies) c.partnershipOffers = (c.partnershipOffers ?? []).filter((o) => o.validRound >= round);
  const features = featuresFor(state.config);
  for (const c of state.companies) {
    if (c.status !== "active") continue;
    const crng = createRng(state.config.seed, round, "turn", c.id);
    const last = c.history[c.history.length - 1];
    const netBurn = last ? last.netBurn : 0;
    const runway = last ? last.runway : 99;
    generateAcquisitionOffers(state, c, round - 1, netBurn, crng);
    c.dilemma = features.dilemmas ? generateDilemma(state, c, round, netBurn, runway, crng) : null;
  }
  state.challenges = generateChallenges(state, round, createRng(state.config.seed, round, "challenges"));
  openShowdown(state, round, createRng(state.config.seed, round, "showdown"));
  prepareBots(state);
}

/** Simulates the current round for every company and moves the game to the next round. */
export function advanceRound(state: GameState): void {
  if (state.finished) return;
  const round = state.round;
  const months = monthsInRound(state.config, round);
  const features = featuresFor(state.config);
  prepareBots(state);

  const ctxs: SimCtx[] = [];
  const reports = new Map<string, RoundReport>();
  for (const c of state.companies) {
    if (c.status !== "active") continue;
    const report = newReport(round, c.id);
    state.reports.push(report);
    reports.set(c.id, report);
  }
  const reportOf = (id: string) => reports.get(id);
  const pitchCandidates: PitchCandidate[] = [];
  const followUps: Array<() => void> = [];
  for (const c of state.companies) {
    if (c.status !== "active") continue;
    const report = reports.get(c.id)!;
    const d = sanitizeDecision(state, c, c.decision ?? carryOverDecision(c));
    if (!c.submitted && !c.isBot) report.lines.push({ kind: "info", text: lt("No decision submitted: last round's settings were applied.", "Nessuna decisione inviata: sono state applicate le impostazioni del round precedente.") });
    c.decision = d;
    report.decision = structuredClone(d);
    const rng = createRng(state.config.seed, round, "company", c.id);
    const x = buildCtx(state, c, d, rng, report, features, false);

    if (d.acceptAcquisitionId) {
      const offer = c.acquisitionOffers.find((o) => o.id === d.acceptAcquisitionId && o.validRound >= round);
      const sold = offer?.kind === "team" ? completeTeamAcquisition(state, c, offer, round, reportOf) : acceptAcquisition(state, c, d.acceptAcquisitionId, round, report);
      if (sold) {
        c.lastDecision = d;
        continue;
      }
    }
    // the loan is assessed on the numbers the team saw when deciding (before switches and dilemmas)
    processLoanRequest(state, x, round);
    if (c.dilemma) {
      const res = resolveDilemma(state, c, d.dilemmaChoice, round, rng, report);
      if (res.exited) {
        c.lastDecision = d;
        continue;
      }
    }
    applyStrategySwitch(c, d, report);
    resolvePendingRisks(state, c, round, rng, report);
    x.oneOffCosts = oneOffCosts(c, d);
    for (const id of d.fires) fireEmployee(state, c, id, state.month, report, "fired");
    if (d.fires.length > 0) c.morale = clamp(c.morale - 0.04 * d.fires.length, 0.05, 1);
    applyReputationAction(x);

    payPendingGrants(c, round, report);
    for (const id of d.acceptTermSheetIds) acceptTermSheet(state, c, id, round, report);
    for (const p of d.pitches) {
      x.distraction += 0.1;
      const assessment = assessPitch(state, c, p, rng, report, round, d.founderHours);
      report.pitchResults.push(assessment.result);
      pitchCandidates.push({ c, report, assessment, order: pitchCandidates.length });
    }
    c.termSheets = c.termSheets.filter((t) => t.validRound > round);
    processGrantApplication(state, x, round);
    applyPrice(state, x, d.price);
    ctxs.push(x);
    // proposals to other teams go out after every company has acted on last round's ones
    followUps.push(() => {
      if (c.status !== "active") return;
      acceptPartnerships(state, c, d, round, reportOf);
      sendPartnershipProposals(state, c, d, round, reportOf);
      sendAcquisitionBid(state, c, d, round, reportOf);
    });
  }
  // investors with limited slots and capital pick the best deals among all teams
  allocateDeals(state, pitchCandidates, round);
  for (const f of followUps) f();

  resolveInteractions(state, ctxs, round);
  resolveHiring(state, ctxs, round, (x) => projectedRunway(state, x, round), createRng(state.config.seed, round, "hiring"));

  for (const x of ctxs) {
    x.mods = effectiveModifiers(state, x.c, x.c.sector, round);
    x.cap = computeCapacities(x.c, x.d, state.month, x.mods.dev, x.mods.sales);
    scheduleCompanyEvents(state, x, months);
  }

  for (let m = 0; m < months; m++) {
    simulateMonth(state, ctxs, round, m);
  }

  for (const x of ctxs) endOfRound(state, x, round, months);
  resolveShowdown(state, round, (id) => ctxs.find((x) => x.c.id === id)?.report);

  for (const c of state.companies) c.modifiers = c.modifiers.filter((mo) => mo.untilRound > round);
  state.globalModifiers = state.globalModifiers.filter((mo) => mo.untilRound > round);
  state.month += months;
  state.round = round + 1;
  if (state.round > state.config.totalRounds) {
    finishGame(state);
  } else {
    newDecisionPhase(state, state.round);
  }
}

function simulateMonth(state: GameState, ctxs: SimCtx[], round: number, m: number): void {
  const month = state.month + m;
  const active = ctxs.filter((x) => x.c.status === "active");
  for (const x of active) {
    x.mods = effectiveModifiers(state, x.c, x.c.sector, round);
    x.cap = computeCapacities(x.c, x.d, month, x.mods.dev, x.mods.sales);
    if (maybeLaunch(x, round)) convertWaitlist(state, x);
    productMonth(x);
  }
  const bySector = new Map<SectorId, SimCtx[]>();
  for (const x of active) {
    const list = bySector.get(x.c.sector) ?? [];
    list.push(x);
    bySector.set(x.c.sector, list);
  }
  for (const [sector, list] of bySector) marketMonth(state, SECTORS[sector], list);
  for (const x of active) {
    financeMonth(state, x, round, m);
    brandAndSentiment(state, x);
    teamMonth(state, x, month, round);
    for (const ev of x.scheduledEvents.filter((e) => e.month === m)) fireCompanyEvent(state, x, ev.templateId, round);
    x.c.monthly.push({ month: month + 1, cash: x.c.cash, mrr: x.c.mrr, customers: x.c.customers });
  }
}

function endOfRound(state: GameState, x: SimCtx, round: number, months: number): void {
  const c = x.c;
  if (c.status !== "active") return;
  if (c.flags.salaryCutUntil !== null && c.flags.salaryCutUntil <= round) {
    c.flags.salaryCutUntil = null;
    c.flags.salaryCutPct = 0;
  }
  reputationDrift(c);
  handleInsolvency(state, c, round, Math.max(0, -lastMonthNet(state, x, round)), x.report);
  updateValuation(state, c, round);
  summaryLines(x);
  const snap = makeSnapshot(state, x, round, months);
  const prev = c.history[c.history.length - 1] ?? null;
  c.history.push(snap);
  if (c.status === "active") {
    checkAchievements(state, c, round, snap, x.report);
    evaluateChallenges(state, c, round, snap, prev, x.d, x.report);
  }
  x.report.insights = mentorInsights(state, c, snap);
  c.lastDecision = x.d;
  c.decision = null;
  c.submitted = false;
}

function finishGame(state: GameState): void {
  state.finished = true;
  state.round = state.config.totalRounds;
  state.outlook = [];
  for (const c of state.companies) {
    const report = state.reports.find((r) => r.companyId === c.id && r.round === state.config.totalRounds) ?? newReport(state.config.totalRounds, c.id);
    if (c.status === "active") updateValuation(state, c, state.config.totalRounds);
    finalAchievements(state, c, report);
    c.dilemma = null;
    c.acquisitionOffers = [];
    c.termSheets = [];
    c.counterOffers = [];
  }
}

/** Starts the first decision phase of a freshly created game. */
export function startGame(state: GameState): void {
  newDecisionPhase(state, 1);
}

// ---------------------------------------------------------------------------------------
// Preview ("what if") of a decision, used live by the decision screen
// ---------------------------------------------------------------------------------------

export function previewDecision(state: GameState, companyId: string, decision: Decision): PreviewResult | null {
  const s = structuredClone(state) as GameState;
  const c = s.companies.find((x) => x.id === companyId);
  if (!c || c.status !== "active") return null;
  const d = sanitizeDecision(s, c, decision);
  const rng = createPreviewRng();
  const features = featuresFor(s.config);
  const report = newReport(s.round, c.id);
  const x = buildCtx(s, c, d, rng, report, features, true);
  // same order as the round: the loan is assessed before a strategy switch
  processLoanRequest(s, x, s.round);
  applyStrategySwitch(c, d, null);
  const months = monthsInRound(s.config, s.round);
  x.oneOffCosts = oneOffCosts(c, d);
  for (const id of d.fires) c.team = c.team.filter((e) => e.id !== id);
  x.distraction += REPUTATION_ACTIONS[d.reputationAction].distraction + 0.1 * d.pitches.length;
  for (const id of d.acceptTermSheetIds) acceptTermSheet(s, c, id, s.round, report);
  applyPrice(s, x, d.price);
  // Assume every offer (and accepted counter-offer) is accepted.
  let hiringCost = 0;
  const offers = [
    ...d.offers,
    ...c.counterOffers.filter((co) => d.acceptCounterIds.includes(co.id)).map((co) => ({ candidateId: co.candidateId, salary: co.salary, equityPct: co.equityPct })),
  ];
  for (const o of offers) {
    const cand = s.candidates.find((k) => k.id === o.candidateId);
    if (!cand) continue;
    hiringCost += o.salary / 12;
    const e: Employee = {
      id: `preview_${cand.id}`, candidateId: cand.id, name: cand.name, role: cand.role, seniority: cand.seniority, salary: o.salary,
      equityPct: o.equityPct, stats: { ...cand.stats }, perks: cand.perks, riskTags: cand.riskTags, hiddenBonuses: [], cv: cand.cv,
      hiredRound: s.round, startMonth: s.month, holderId: null, moraleOffset: 0,
    };
    c.team.push(e);
  }
  x.mods = effectiveModifiers(s, c, c.sector, s.round);
  x.cap = computeCapacities(c, d, s.month, x.mods.dev, x.mods.sales);
  // Other companies of the sector are kept static.
  for (let m = 0; m < months; m++) simulateMonth(s, [x], s.round, m);
  const net = -lastMonthNet(s, x, s.round);
  const q = quote(s, x, d.price);
  return {
    cashEnd: c.cash,
    runway: net <= 0 ? 999 : Math.max(0, c.cash / net),
    netBurnMonthly: net,
    expensesMonthly: monthlyExpenses(s, c, d, s.round, x.cap.traits.burn).total,
    revenueMonthlyEnd: c.product.launched ? c.mrr : 0,
    customersEnd: c.customers,
    newCustomers: x.newCustomers,
    mvpProgressEnd: c.product.mvpProgress,
    launched: c.product.launched,
    techDebtEnd: c.product.techDebt,
    pmfEnd: c.pmf.score,
    cac: q.cac,
    ltv: q.ltv,
    wtp: q.wtp,
    churn: q.churn,
    headcount: headcount(c),
    oneOffCosts: x.oneOffCosts,
    hiringCostMonthly: hiringCost,
  };
}
