import { combinedMultipliers } from "../data/founders";
import { GRANTS, INVESTORS, LENDERS, grantDef, investorDef, lenderDef, type InvestorDef, type LenderDef } from "../data/investors";
import { SECTORS } from "../data/sectors";
import type { Rng } from "../rng";
import { fill, lt, moneyShort, type LText, moneyL, decL } from "../text";
import type { Company, Decision, GameState, Instrument, Pitch, PitchResult, RequirementCheck, RoundReport } from "../types";
import { SAFE_LIMIT, applyEquityRound, issueWarrants, totalShares } from "./captable";
import type { SimCtx } from "./context";
import { applyBundle } from "./effects";
import { DISCOVERY } from "./product";
import { monthlySalaries } from "./team";
import { annualGrowth, computeValuation, teamStrength } from "./valuation";
import { activeFounders, clamp, effectiveModifiers, headcount, nextId, prepaidMonthly } from "./util";

// ---------------------------------------------------------------------------------------
// Costs
// ---------------------------------------------------------------------------------------

export interface ExpenseBreakdown {
  salaries: number;
  rd: number;
  marketing: number;
  ops: number;
  discovery: number;
  overhead: number;
  compliance: number;
  office: number;
  total: number;
}

export function monthlyExpenses(state: GameState, c: Company, d: Decision, round: number, burnTrait = 0): ExpenseBreakdown {
  const mods = effectiveModifiers(state, c, c.sector, round);
  const n = headcount(c);
  const salaries = monthlySalaries(c, round);
  const overhead = (1_000 + 250 * n) * (1 + burnTrait);
  const compliance = c.product.launched ? Math.max(0, SECTORS[c.sector].complianceCost + mods.compliance) : 0;
  const office = c.flags.officeMode === "office" ? 2_500 + 250 * n : 0;
  const discovery = DISCOVERY[d.discovery].cost;
  const total = salaries + d.rdBudget + d.marketingBudget + d.opsBudget + discovery + overhead + compliance + office;
  return { salaries, rd: d.rdBudget, marketing: d.marketingBudget, ops: d.opsBudget, discovery, overhead, compliance, office, total };
}

/** One month of cash flow. Returns the operating cash flow of the month. */
export function financeMonth(state: GameState, x: SimCtx, round: number, monthIndex: number): number {
  const c = x.c;
  const exp = monthlyExpenses(state, c, x.d, round, x.cap.traits.burn);
  const q = clamp(SECTORS[c.sector].grossMargin + Math.min(0.05, x.cap.opsPts * 0.002) + x.mods.gm, 0.05, 0.95);
  const revenue = c.product.launched ? c.mrr : 0;
  const cogs = revenue * (1 - q);
  // customers who prepaid a year upfront are served without paying again
  const collected = Math.max(0, revenue - prepaidMonthly(c));
  if (c.prepayments) {
    for (const p of c.prepayments) p.monthsLeft -= 1;
    c.prepayments = c.prepayments.filter((p) => p.monthsLeft > 0);
  }
  let debt = 0;
  for (const l of c.loans) {
    if (l.remaining <= 0) continue;
    // fixed rate, set when the loan was signed (a rate rise only affects new loans)
    const interest = (l.remaining * l.annualRate) / 12;
    const principal = Math.min(l.remaining, Math.max(0, l.monthlyPayment - (l.remaining * l.annualRate) / 12));
    l.remaining -= principal;
    l.monthsLeft = Math.max(0, l.monthsLeft - 1);
    debt += interest + principal;
  }
  c.loans = c.loans.filter((l) => l.remaining > 1);
  const oneOff = monthIndex === 0 ? x.oneOffCosts : 0;
  const flow = collected - cogs - exp.total - debt - oneOff;
  c.cash += flow;
  x.revenue += revenue;
  x.grossProfit += revenue - cogs;
  x.expenses += exp.total + oneOff + debt;
  x.monthlyExpensesLast = exp.total + debt;
  return revenue - cogs - exp.total;
}

// ---------------------------------------------------------------------------------------
// Investors
// ---------------------------------------------------------------------------------------

export function investorChecks(state: GameState, c: Company, inv: InvestorDef, founderHours?: number): RequirementCheck[] {
  const r = inv.requirements;
  const checks: RequirementCheck[] = [];
  if (inv.excluded.includes(c.sector)) {
    checks.push({ label: lt("Invests in your sector", "Investe nel tuo settore"), met: false, hard: true });
  }
  if (r.launched) checks.push({ label: lt("Product launched", "Prodotto lanciato"), met: c.product.launched, hard: true });
  if (r.minMvp !== undefined)
    checks.push({ label: fill(lt("MVP at least {v}% complete", "MVP completo almeno al {v}%"), { v: Math.round(r.minMvp * 100) }), met: c.product.launched || c.product.mvpProgress >= r.minMvp, hard: true });
  if (r.minMrr !== undefined)
    checks.push({ label: fill(lt("Monthly revenue ≥ {v}", "Fatturato mensile ≥ {v}"), { v: moneyL(r.minMrr) }), met: c.mrr >= r.minMrr, hard: true });
  if (r.minPmf !== undefined)
    checks.push({ label: fill(lt("PMF score ≥ {v}", "Punteggio PMF ≥ {v}"), { v: r.minPmf }), met: c.pmf.score >= r.minPmf, hard: true });
  if (r.minCustomers !== undefined)
    checks.push({ label: fill(lt("At least {v} customers", "Almeno {v} clienti"), { v: r.minCustomers }), met: c.customers >= r.minCustomers, hard: true });
  if (r.anyOf) {
    const met = r.anyOf.some(
      (a) => (a.minMrr === undefined || c.mrr >= a.minMrr) && (a.minPmf === undefined || c.pmf.score >= a.minPmf) && (a.minCustomers === undefined || c.customers >= a.minCustomers),
    );
    const parts = r.anyOf.map((a) =>
      a.minMrr !== undefined ? `MRR ≥ ${moneyShort(a.minMrr)}` : a.minPmf !== undefined ? `PMF ≥ ${a.minPmf}` : `${a.minCustomers}+`,
    );
    checks.push({ label: fill(lt("Traction: {v}", "Trazione: {v}"), { v: parts.join(" / ") }), met, hard: true });
  }
  if (r.maxValuation !== undefined)
    checks.push({ label: fill(lt("Valuation below {v}", "Valutazione sotto {v}"), { v: moneyL(r.maxValuation) }), met: c.valuation <= r.maxValuation, hard: true });
  if (r.minRound !== undefined)
    checks.push({ label: fill(lt("From round {v}", "Dal round {v}"), { v: r.minRound }), met: state.round >= r.minRound, hard: true });
  if (r.maxRound !== undefined)
    checks.push({ label: fill(lt("Until round {v}", "Fino al round {v}"), { v: r.maxRound }), met: state.round <= r.maxRound, hard: true });
  if (r.requiresPricedRound)
    checks.push({ label: lt("A previous VC-priced round", "Un precedente round VC"), met: c.lastPricedRound !== null, hard: true });
  if (r.minFounderHours !== undefined) {
    const hours = founderHours ?? c.lastDecision?.founderHours ?? 50;
    checks.push({ label: fill(lt("Founders full-time ({v}h+/week)", "Fondatori a tempo pieno ({v}h+/settimana)"), { v: r.minFounderHours }), met: hours >= r.minFounderHours, hard: true });
  }
  if (inv.oneTime) {
    const used = inv.type === "accelerator" ? c.flags.acceleratorUsed : false;
    checks.push({ label: lt("Only once per company", "Una sola volta per azienda"), met: !used, hard: true });
  }
  const previous = c.fundingHistory.filter((f) => f.investorId === inv.id && f.instrument !== "conversion");
  if (["angel", "accelerator", "crowdfunding"].includes(inv.type)) {
    if (!inv.oneTime) checks.push({ label: lt("Not already an investor", "Non è già un investitore"), met: previous.length === 0, hard: true });
  } else if (previous.length > 0) {
    const lastRound = Math.max(...previous.map((f) => f.round));
    checks.push({ label: lt("Follow-on: at least 2 rounds after their last cheque", "Follow-on: almeno 2 round dopo l'ultimo investimento"), met: state.round - lastRound >= 2, hard: true });
  }
  if (inv.sectors) checks.push({ label: lt("Sector in the fund's thesis", "Settore nella tesi del fondo"), met: inv.sectors.includes(c.sector), hard: !!inv.strictSectors });
  if (inv.capital !== undefined) {
    const left = investorCapacity(state, inv, state.round).capitalLeft;
    checks.push({ label: fill(lt("Capital left for new deals ({v})", "Capitale disponibile per nuovi investimenti ({v})"), { v: moneyL(Math.max(0, left)) }), met: left >= inv.checkMin, hard: true });
  }
  return checks;
}

/** Pre-money valuation an investor considers fair today. */
export function fairValuation(state: GameState, c: Company, inv: InvestorDef): number {
  const b = computeValuation(state, c);
  const mods = effectiveModifiers(state, c, c.sector, state.round);
  const base = Math.max(300_000, b.anchored);
  return base * inv.valuationBias * Math.sqrt(mods.climate) * (1 + 0.003 * (c.reputation.investors - 50));
}

function amountInRange(inv: InvestorDef, amount: number): boolean {
  return amount >= inv.checkMin * 0.8 && amount <= inv.checkMax * 1.2;
}

export function equityPctFor(p: Pitch): number {
  return p.instrument === "safe" ? p.amount / Math.max(1, p.valuation) : p.amount / Math.max(1, p.valuation + p.amount);
}

function rejection(inv: InvestorDef, reason: LText, checks: RequirementCheck[], fair: number, p: Pitch): PitchResult {
  return { investorId: inv.id, investorName: inv.name, outcome: "rejected", reason, amount: p.amount, valuation: p.valuation, fairValuation: fair, checks };
}

export interface PitchAssessment {
  result: PitchResult;
  /** The deal to close if the investor still has a slot and capital (null = no deal). */
  close: Pitch | null;
  /** How much the investor wants this deal: the best scores win limited slots. */
  score: number;
}

/** Evaluates a pitch and closes the deal immediately (no competition with other teams). */
export function evaluatePitch(state: GameState, c: Company, p: Pitch, rng: Rng, report: RoundReport, round: number, founderHours: number): PitchResult {
  const a = assessPitch(state, c, p, rng, report, round, founderHours);
  const inv = investorDef(p.investorId);
  if (a.close && inv) closeDeal(state, c, inv, a.close, round, report);
  return a.result;
}

export function assessPitch(state: GameState, c: Company, p: Pitch, rng: Rng, _report: RoundReport, round: number, founderHours: number): PitchAssessment {
  const done = (result: PitchResult, close: Pitch | null = null, score = 0): PitchAssessment => ({ result, close, score });
  const inv = investorDef(p.investorId);
  if (!inv) {
    return done({ investorId: p.investorId, investorName: "?", outcome: "rejected", reason: lt("Unknown investor.", "Investitore sconosciuto."), amount: p.amount, valuation: p.valuation, fairValuation: 0, checks: [] });
  }
  const checks = investorChecks(state, c, inv, founderHours);
  const fair = fairValuation(state, c, inv);
  const unmet = checks.find((ch) => ch.hard && !ch.met);
  if (unmet) {
    return done(rejection(inv, fill(lt("We can't invest yet. Missing requirement: {r}.", "Non possiamo ancora investire. Requisito mancante: {r}."), { r: unmet.label }), checks, fair, p));
  }
  if (inv.excluded.includes(c.sector)) return done(rejection(inv, lt("Not a sector we invest in.", "Non è un settore in cui investiamo."), checks, fair, p));

  const mods = effectiveModifiers(state, c, c.sector, round);
  const mult = combinedMultipliers(activeFounders(c).map((f) => f.archetype));
  const runway = estimateRunway(state, c);
  const noise = rng.normal(0, 0.07);

  // Accelerator: fixed terms, selection on team and learning.
  if (inv.fixedTerms) {
    const dims = (c.pmf.problemClarity + c.pmf.solutionFit + c.pmf.learningVelocity) / 3;
    const score = 0.25 + 0.35 * dims + 0.15 * teamStrength(c) + (founderHours >= 60 ? 0.08 : 0) + 0.1 * (c.reputation.investors / 100) + 0.2 * (mult.fundraising - 1) + noise;
    const fixed: Pitch = { investorId: inv.id, amount: inv.fixedTerms.amount, valuation: inv.fixedTerms.amount / inv.fixedTerms.equityPct - inv.fixedTerms.amount, instrument: "equity" };
    if (score >= 0.5) {
      return done({ investorId: inv.id, investorName: inv.name, outcome: "closed", reason: lt("Welcome to the batch! Demo Day is in three months.", "Benvenuti nel batch! Il Demo Day è tra tre mesi."), amount: fixed.amount, valuation: fixed.valuation, fairValuation: fair, checks }, fixed, score);
    }
    c.flags.acceleratorUsed = true;
    return done(rejection(inv, lt("Not selected this time: the committee wants more evidence of customer learning.", "Non selezionati questa volta: il comitato vuole più prove di apprendimento dai clienti."), checks, fair, p));
  }

  const ask = p.instrument === "safe" ? p.valuation - p.amount : p.valuation;
  const askRatio = ask / Math.max(1, fair);
  const dilution = equityPctFor(p);

  if (dilution > 0.4) {
    return done(rejection(inv, lt("Selling that much of the company would demotivate the founders. Ask for less money or a higher valuation.", "Cedere così tanto dell'azienda demotiverebbe i fondatori. Chiedi meno soldi o una valutazione più alta."), checks, fair, p));
  }
  if (p.instrument === "safe" && c.safes.reduce((s, x) => s + x.amount / Math.max(1, x.cap), 0) + dilution > SAFE_LIMIT) {
    return done(rejection(inv, lt("Your SAFEs would already convert into most of the company: raise a priced round first.", "I vostri SAFE si convertirebbero già nella maggior parte dell'azienda: fate prima un round con prezzo."), checks, fair, p));
  }

  // Equity crowdfunding: the crowd decides.
  if (inv.type === "crowdfunding") {
    const community = Math.min(1, c.customers / 2_000);
    const score = 0.3 + 0.25 * community + 0.2 * (c.reputation.media / 100) + 0.15 * c.brand + 0.15 * (c.reputation.customers / 100) - 0.4 * Math.max(0, askRatio - 1.3) + (mods.climate - 1) * 0.2 + noise;
    if (!amountInRange(inv, p.amount)) return done(rejection(inv, lt("The campaign target is outside the platform limits.", "L'obiettivo della campagna è fuori dai limiti della piattaforma."), checks, fair, p));
    if (score >= 0.5) {
      return done({ investorId: inv.id, investorName: inv.name, outcome: "closed", reason: lt("Campaign funded! Hundreds of new shareholders believe in you.", "Campagna finanziata! Centinaia di nuovi soci credono in te."), amount: p.amount, valuation: p.valuation, fairValuation: fair, checks }, p, score);
    }
    const reached = Math.round(clamp(score / 0.5, 0.1, 0.95) * 100);
    return done(rejection(inv, fill(lt("The campaign reached only {p}% of its target and was cancelled (all-or-nothing).", "La campagna ha raggiunto solo il {p}% dell'obiettivo ed è stata annullata (tutto o niente)."), { p: reached }), checks, fair, p));
  }

  const sectorFit = inv.sectors ? (inv.sectors.includes(c.sector) ? 0.12 : -0.05) : 0;
  const growth = clamp(annualGrowth(c) / 2, -0.5, 1);
  const crowdPenalty = c.capTable.holders.some((h) => h.kind === "crowd") && ["seed", "seriesA", "growth"].includes(inv.type) ? 0.05 : 0;
  const rangePenalty = amountInRange(inv, p.amount) ? 0 : 0.15;
  const interest =
    inv.appetite +
    sectorFit +
    0.25 * (c.pmf.score / 100 - 0.45) +
    0.12 * growth +
    0.1 * (c.reputation.investors / 100 - 0.3) +
    0.08 * (teamStrength(c) - 0.5) +
    0.3 * (mult.fundraising - 1) +
    (mods.climate - 1) * 0.4 -
    0.6 * Math.max(0, askRatio - 1) -
    crowdPenalty -
    rangePenalty -
    (runway < 3 ? 0.08 : 0) +
    noise;

  if (interest >= 0.55 && askRatio <= 1.15 && rangePenalty === 0) {
    return done({ investorId: inv.id, investorName: inv.name, outcome: "closed", reason: lt("Deal! The money is in your account.", "Affare fatto! I soldi sono sul tuo conto."), amount: p.amount, valuation: p.valuation, fairValuation: fair, checks }, p, interest);
  }
  if (interest >= 0.4) {
    const valuation = Math.round(Math.min(ask, fair * rng.range(0.9, 1.0)) / 10_000) * 10_000;
    const amount = Math.round(clamp(p.amount * (askRatio > 1.15 ? 0.85 : 1), inv.checkMin, inv.checkMax) / 10_000) * 10_000;
    const tsValuation = p.instrument === "safe" ? valuation + amount : valuation;
    c.termSheets.push({
      id: nextId(state, "ts"),
      investorId: inv.id,
      investorName: inv.name,
      amount,
      valuation: tsValuation,
      instrument: p.instrument,
      validRound: round + 1,
      boardSeat: inv.boardSeat,
      poolTopUp: inv.poolTopUp,
      liquidationPref: inv.liquidationPref,
      note: fill(
        lt("Interested, but at our terms: {a} at {v} {t}.", "Interessati, ma alle nostre condizioni: {a} a {v} {t}."),
        { a: moneyL(amount), v: moneyL(tsValuation), t: p.instrument === "safe" ? "cap" : "pre-money" },
      ),
    });
    return done({
      investorId: inv.id,
      investorName: inv.name,
      outcome: "termSheet",
      reason: fill(
        lt("They sent a term sheet with different terms: {a} at a {v} valuation. Accept it next round if you want it.", "Hanno inviato un term sheet con condizioni diverse: {a} con valutazione {v}. Puoi accettarlo nel prossimo round."),
        { a: moneyL(amount), v: moneyL(tsValuation) },
      ),
      amount,
      valuation: tsValuation,
      fairValuation: fair,
      checks,
    });
  }
  let reason: LText;
  if (rangePenalty > 0) reason = fill(lt("Your ask is outside our usual cheque size ({a}-{b}).", "La tua richiesta è fuori dal nostro ticket abituale ({a}-{b})."), { a: moneyL(inv.checkMin), b: moneyL(inv.checkMax) });
  else if (askRatio > 1.3) reason = fill(lt("Valuation too high: you asked {ask}, we see the company at about {fair}.", "Valutazione troppo alta: hai chiesto {ask}, noi vediamo l'azienda a circa {fair}."), { ask: moneyL(ask), fair: moneyL(fair) });
  else if (c.pmf.score < 45) reason = lt("Not enough evidence of product-market fit yet. Come back with stronger retention.", "Non ci sono ancora abbastanza prove di product-market fit. Tornate con una retention più forte.");
  else if (mods.climate < 0.85) reason = lt("The market is tough right now: we are only doing follow-ons on our portfolio.", "Il mercato è difficile in questo momento: facciamo solo follow-on sul nostro portafoglio.");
  else if (sectorFit < 0) reason = lt("Interesting, but outside our investment thesis.", "Interessante, ma fuori dalla nostra tesi di investimento.");
  else reason = lt("We'll pass for now. Keep us posted on your traction.", "Per ora passiamo. Teneteci aggiornati sulla trazione.");
  return done(rejection(inv, reason, checks, fair, p));
}

// ---------------------------------------------------------------------------------------
// Limited capital: investors back a few startups per round, and pitches compete for them
// ---------------------------------------------------------------------------------------

export function investorCapacity(state: GameState, inv: InvestorDef, round: number): { capitalLeft: number; slotsLeft: number } {
  const book = state.investorBook?.[inv.id];
  const committed = book?.committed ?? 0;
  const dealsNow = book ? book.deals.filter((d) => d.round === round).length : 0;
  return { capitalLeft: (inv.capital ?? Infinity) - committed, slotsLeft: (inv.dealsPerRound ?? Infinity) - dealsNow };
}

function recordDeal(state: GameState, inv: InvestorDef, companyId: string, amount: number, round: number): void {
  if (!state.investorBook) state.investorBook = {};
  const book = (state.investorBook[inv.id] ??= { committed: 0, deals: [] });
  book.committed += amount;
  book.deals.push({ round, companyId });
}

export interface PitchCandidate {
  c: Company;
  report: RoundReport;
  assessment: PitchAssessment;
  order: number;
}

/**
 * Closes the deals investors want, best first, while they have slots and capital this
 * round. Pitches that lose the competition are told who got the money.
 */
export function allocateDeals(state: GameState, candidates: PitchCandidate[], round: number): void {
  const byInvestor = new Map<string, PitchCandidate[]>();
  for (const k of candidates) {
    if (!k.assessment.close) continue;
    const list = byInvestor.get(k.assessment.result.investorId) ?? [];
    list.push(k);
    byInvestor.set(k.assessment.result.investorId, list);
  }
  for (const [invId, list] of byInvestor) {
    const inv = investorDef(invId);
    if (!inv) continue;
    list.sort((a, b) => b.assessment.score - a.assessment.score || a.order - b.order);
    const winners: string[] = [];
    for (const k of list) {
      const deal = k.assessment.close!;
      const cap = investorCapacity(state, inv, round);
      if (cap.slotsLeft >= 1 && deal.amount <= cap.capitalLeft) {
        closeDeal(state, k.c, inv, deal, round, k.report);
        recordDeal(state, inv, k.c.id, deal.amount, round);
        winners.push(k.c.name);
        continue;
      }
      const r = k.assessment.result;
      r.outcome = "rejected";
      r.reason =
        cap.slotsLeft < 1
          ? fill(
              lt("We liked your pitch, but this round we invested in {w} and back only {n} startup(s) per round. Try again next round.", "Il pitch ci è piaciuto, ma questo round abbiamo investito in {w} e sosteniamo solo {n} startup per round. Riprovate il prossimo round."),
              { w: winners.join(", "), n: inv.dealsPerRound ?? 1 },
            )
          : cap.capitalLeft >= inv.checkMin
            ? fill(lt("We liked your pitch, but we only have {a} left to invest: ask for less.", "Il pitch ci è piaciuto, ma ci restano solo {a} da investire: chiedete meno."), { a: moneyL(cap.capitalLeft) })
            : lt("Our fund has no capital left for new investments.", "Il nostro fondo non ha più capitale per nuovi investimenti.");
      if (inv.type === "accelerator") k.c.flags.acceleratorUsed = false;
    }
  }
}

/** Closes a financing deal (equity, SAFE or crowd) and applies perks. */
export function closeDeal(state: GameState, c: Company, inv: InvestorDef, p: Pitch, round: number, report: RoundReport, opts?: { poolTopUp?: number; liquidationPref?: number; boardSeat?: boolean }): void {
  const poolTopUp = opts?.poolTopUp ?? inv.poolTopUp;
  const pref = opts?.liquidationPref ?? inv.liquidationPref;
  const boardSeat = opts?.boardSeat ?? inv.boardSeat;
  const instrument: Instrument = p.instrument;
  c.cash += p.amount;
  c.totalRaised += p.amount;
  c.flags.everRaisedEquity = true;
  if (inv.type === "accelerator") c.flags.acceleratorUsed = true;
  if (inv.type === "crowdfunding") c.flags.crowdfundingUsed = true;

  if (instrument === "safe") {
    c.safes.push({ id: nextId(state, "safe"), investorId: inv.id, investorName: inv.name, amount: p.amount, cap: p.valuation, round });
    c.fundingHistory.push({
      id: nextId(state, "fr"), round, investorId: inv.id, investorName: inv.name, type: inv.type, instrument: "safe",
      amount: p.amount, preMoney: null, postMoney: p.valuation, equityPct: p.amount / p.valuation, boardSeat: false,
    });
    report.lines.push({ kind: "finance", text: fill(lt("SAFE signed with {n}: {a} with a {v} valuation cap.", "SAFE firmato con {n}: {a} con cap di valutazione {v}."), { n: inv.name, a: moneyL(p.amount), v: moneyL(p.valuation) }) });
  } else {
    const label = { angel: "Angel", accelerator: "Accelerator", seed: "Seed", seriesA: "Series A", growth: "Series B", corporate: "Strategic", crowdfunding: "Crowd", grant: "Grant", bank: "Loan", ventureDebt: "Debt" }[inv.type];
    const res = applyEquityRound(state, c, {
      investorId: inv.id,
      investorName: inv.name,
      amount: p.amount,
      preMoney: p.valuation,
      poolTarget: poolTopUp,
      liquidationPref: pref,
      kind: inv.type === "crowdfunding" ? "crowd" : "investor",
      roundLabel: label,
    });
    if (inv.type !== "crowdfunding" && inv.type !== "angel" && inv.type !== "accelerator") {
      c.lastPostMoney = res.postMoney;
      c.lastPricedRound = round;
    } else if (c.lastPostMoney === null || res.postMoney > c.lastPostMoney) {
      c.lastPostMoney = res.postMoney;
      c.lastPricedRound = round;
    }
    if (boardSeat) c.board.investors += 1;
    if (inv.type === "growth") c.board.independents += 1;
    c.fundingHistory.push({
      id: nextId(state, "fr"), round, investorId: inv.id, investorName: inv.name, type: inv.type, instrument: inv.type === "crowdfunding" ? "crowd" : "equity",
      amount: p.amount, preMoney: p.valuation, postMoney: res.postMoney, equityPct: res.investorPct, boardSeat,
    });
    for (const s of res.convertedSafes) {
      c.fundingHistory.push({
        id: nextId(state, "fr"), round, investorId: s.safe.investorId, investorName: s.safe.investorName, type: "angel", instrument: "conversion",
        amount: s.safe.amount, preMoney: null, postMoney: null, equityPct: s.pct, boardSeat: false,
      });
    }
    report.lines.push({
      kind: "finance",
      text: fill(
        lt("Closed {a} from {n} at {v} pre-money: they now own {p}% of the company.{pool}", "Chiusi {a} da {n} a {v} pre-money: ora possiedono il {p}% dell'azienda.{pool}"),
        {
          a: moneyL(p.amount),
          n: inv.name,
          v: moneyL(p.valuation),
          p: decL(res.investorPct * 100, 1),
          pool: res.poolAdded > 0 ? fill(lt(" (+{x}% option pool)", " (+{x}% di option pool)"), { x: decL((res.poolAdded / totalShares(c.capTable)) * 100, 1) }) : "",
        },
      ),
    });
  }
  c.reputation.investors = Math.min(100, c.reputation.investors + inv.repBoost);
  for (const perk of inv.perks) {
    if (perk.sectors && !perk.sectors.includes(c.sector)) continue;
    if (perk.bundle) applyBundle(state, c, perk.bundle, perk.text, round);
    if (perk.modifier) applyBundle(state, c, { modifier: perk.modifier }, perk.text, round);
  }
}

export function acceptTermSheet(state: GameState, c: Company, tsId: string, round: number, report: RoundReport): void {
  const ts = c.termSheets.find((t) => t.id === tsId);
  if (!ts || ts.validRound < round) return;
  const inv = investorDef(ts.investorId);
  if (!inv) return;
  if (investorCapacity(state, inv, round).capitalLeft < ts.amount) {
    report.lines.push({ kind: "finance", text: fill(lt("{n} has no capital left: the term sheet lapsed.", "{n} non ha più capitale: il term sheet è decaduto."), { n: inv.name }) });
    c.termSheets = c.termSheets.filter((t) => t.id !== tsId);
    return;
  }
  recordDeal(state, inv, c.id, ts.amount, round);
  closeDeal(state, c, inv, { investorId: inv.id, amount: ts.amount, valuation: ts.valuation, instrument: ts.instrument }, round, report, {
    poolTopUp: ts.poolTopUp,
    liquidationPref: ts.liquidationPref,
    boardSeat: ts.boardSeat,
  });
  c.termSheets = c.termSheets.filter((t) => t.id !== tsId);
}

// ---------------------------------------------------------------------------------------
// Grants and loans
// ---------------------------------------------------------------------------------------

export function grantChecks(c: Company, grantId: string): RequirementCheck[] {
  const g = grantDef(grantId);
  if (!g) return [];
  return [
    { label: lt("Eligible sector", "Settore ammissibile"), met: !g.sectors || g.sectors.includes(c.sector), hard: true },
    { label: fill(lt("MVP at least {v}%", "MVP almeno al {v}%"), { v: Math.round(g.minMvp * 100) }), met: c.product.launched || c.product.mvpProgress >= g.minMvp, hard: true },
    { label: fill(lt("Problem clarity ≥ {v}%", "Chiarezza del problema ≥ {v}%"), { v: Math.round(g.minProblemClarity * 100) }), met: c.pmf.problemClarity >= g.minProblemClarity, hard: true },
    { label: lt("Not already received", "Non già ottenuto"), met: !c.flags.grantsUsed.includes(g.id), hard: true },
  ];
}

export function processGrantApplication(state: GameState, x: SimCtx, round: number): void {
  const c = x.c;
  const id = x.d.grantApplication;
  if (!id) return;
  const g = grantDef(id);
  if (!g) return;
  x.distraction += g.devPenalty;
  const unmet = grantChecks(c, id).find((ch) => !ch.met);
  if (unmet) {
    x.report.lines.push({ kind: "bad", text: fill(lt("Grant application '{g}' rejected: {r}.", "Domanda per '{g}' respinta: {r}."), { g: g.name, r: unmet.label }) });
    return;
  }
  const mods = effectiveModifiers(state, c, c.sector, round);
  const p = clamp(g.baseSuccess + 0.3 * (c.pmf.problemClarity - 0.4) + 0.1 * (c.reputation.investors / 100) + 0.1 * teamStrength(c) + (mods.climate - 1) * 0.2, 0.05, 0.9);
  c.flags.grantsUsed.push(id);
  if (x.rng.chance(p)) {
    c.pendingGrants.push({ id: nextId(state, "grant"), grantId: id, name: g.name, amount: g.amount, round: round + 1 });
    x.report.lines.push({ kind: "finance", text: fill(lt("Grant '{g}' approved! {a} will be paid next round.", "Bando '{g}' approvato! {a} verranno erogati il prossimo round."), { g: g.name, a: moneyL(g.amount) }) });
  } else {
    x.report.lines.push({ kind: "bad", text: fill(lt("Grant '{g}' not approved: the evaluation committee ranked other projects higher.", "Bando '{g}' non approvato: la commissione ha premiato altri progetti."), { g: g.name }) });
  }
}

export function payPendingGrants(c: Company, round: number, report: RoundReport): void {
  for (const g of c.pendingGrants.filter((x) => x.round <= round)) {
    c.cash += g.amount;
    c.totalRaised += g.amount;
    c.fundingHistory.push({ id: g.id, round, investorId: g.grantId, investorName: g.name.en, type: "grant", instrument: "grant", amount: g.amount, preMoney: null, postMoney: null, equityPct: 0, boardSeat: false });
    report.lines.push({ kind: "finance", text: fill(lt("Grant paid: +{a} (non-dilutive).", "Bando erogato: +{a} (non diluitivo)."), { a: moneyL(g.amount) }) });
  }
  c.pendingGrants = c.pendingGrants.filter((x) => x.round > round);
}

export function loanLimit(c: Company, lender: LenderDef, round: number): { max: number; checks: RequirementCheck[] } {
  const checks: RequirementCheck[] = [];
  let max = 0;
  const owed = c.loans.filter((l) => l.lenderId === lender.id).reduce((sum, l) => sum + l.remaining, 0);
  if (lender.id === "loan_public") {
    checks.push({ label: lt("MVP at least 50% or launched", "MVP almeno al 50% o lanciato"), met: c.product.launched || c.product.mvpProgress >= 0.5, hard: true });
    checks.push({ label: lt("Only once per company", "Una sola volta per azienda"), met: !c.loans.some((l) => l.lenderId === lender.id) && !c.fundingHistory.some((f) => f.investorId === lender.id), hard: true });
    max = 150_000;
  } else if (lender.id === "loan_bank") {
    checks.push({ label: lt("Monthly revenue ≥ €8k", "Fatturato mensile ≥ 8k€"), met: c.mrr >= 8_000, hard: true });
    max = Math.min(250_000, c.mrr * 8) - owed;
  } else if (lender.id === "loan_venture") {
    const last = [...c.fundingHistory].reverse().find((f) => f.instrument === "equity" && ["seed", "seriesA", "growth", "corporate"].includes(f.type));
    checks.push({ label: lt("A VC round in the last 3 rounds", "Un round VC negli ultimi 3 round"), met: !!last && round - last.round <= 3, hard: true });
    max = last ? last.amount * 0.35 - owed : 0;
  }
  return { max: Math.max(0, Math.floor(max / 1_000) * 1_000), checks };
}

export function processLoanRequest(state: GameState, x: SimCtx, round: number): void {
  const c = x.c;
  const req = x.d.loanRequest;
  if (!req || req.amount <= 0) return;
  const lender = lenderDef(req.lenderId);
  if (!lender) return;
  const { max, checks } = loanLimit(c, lender, round);
  const unmet = checks.find((ch) => !ch.met);
  if (unmet || req.amount > max) {
    x.report.lines.push({
      kind: "bad",
      text: unmet
        ? fill(lt("{l} declined the loan: {r}.", "{l} ha rifiutato il prestito: {r}."), { l: lender.name, r: unmet.label })
        : fill(lt("{l} declined: the maximum they can lend you is {m}.", "{l} ha rifiutato: il massimo che può prestarti è {m}."), { l: lender.name, m: moneyL(max) }),
    });
    return;
  }
  const mods = effectiveModifiers(state, c, c.sector, round);
  const rate = lender.annualRate + (lender.annualRate > 0 ? mods.debtRate : 0);
  const n = lender.termMonths;
  const i = rate / 12;
  const payment = i > 0 ? (req.amount * i) / (1 - Math.pow(1 + i, -n)) : req.amount / n;
  c.loans.push({
    id: nextId(state, "loan"), lenderId: lender.id, lenderName: lender.name, principal: req.amount, remaining: req.amount,
    annualRate: rate, monthlyPayment: payment, monthsLeft: n, personalGuarantee: lender.personalGuarantee, startRound: round,
  });
  c.cash += req.amount;
  c.fundingHistory.push({ id: nextId(state, "fr"), round, investorId: lender.id, investorName: lender.name, type: lender.type, instrument: "loan", amount: req.amount, preMoney: null, postMoney: null, equityPct: lender.warrantsPct, boardSeat: false });
  if (lender.warrantsPct > 0) issueWarrants(state, c, lender.name, lender.id, lender.warrantsPct);
  x.report.lines.push({
    kind: "finance",
    text: fill(lt("Loan from {l}: +{a}, {m} months at {r}% (monthly payment {p}).", "Prestito da {l}: +{a}, {m} mesi al {r}% (rata mensile {p})."), {
      l: lender.name, a: moneyL(req.amount), m: n, r: decL(rate * 100, 1), p: moneyL(payment),
    }),
  });
}

// ---------------------------------------------------------------------------------------
// Runway & insolvency
// ---------------------------------------------------------------------------------------

/** Months of runway at the last known burn (999 = profitable). */
export function estimateRunway(_state: GameState, c: Company): number {
  const last = c.history[c.history.length - 1];
  const burn = last ? last.netBurn : 0;
  if (burn <= 0) return 999;
  return Math.max(0, c.cash / burn);
}

export function runwayFromBurn(cash: number, netBurn: number): number {
  if (netBurn <= 0) return 999;
  return Math.max(0, cash / netBurn);
}

export const RESCUE_INVESTOR = "Last Resort Capital";

/**
 * Handles a negative cash balance at the end of a round. Depending on difficulty, the
 * company gets a punitive rescue round (2x liquidation preference, board seat) or goes bankrupt.
 */
export function handleInsolvency(state: GameState, c: Company, round: number, monthlyBurn: number, report: RoundReport): void {
  if (c.cash >= 0) return;
  const diff = state.config.difficulty;
  const allowed = diff === "forgiving" ? 3 : diff === "standard" ? 1 : 0;
  if (c.rescues < allowed) {
    const amount = Math.round((-c.cash + 3 * Math.max(monthlyBurn, 5_000)) / 10_000) * 10_000;
    let pre = Math.max(100_000, c.valuation * 0.3);
    if (amount / (pre + amount) > 0.7) pre = amount / 0.7 - amount;
    const res = applyEquityRound(state, c, {
      investorId: "rescue", investorName: RESCUE_INVESTOR, amount, preMoney: pre, poolTarget: 0, liquidationPref: 2, kind: "investor", roundLabel: "Rescue",
    });
    c.cash += amount;
    c.totalRaised += amount;
    c.flags.everRaisedEquity = true;
    c.rescues += 1;
    c.board.investors += 1;
    c.lastPostMoney = res.postMoney;
    c.lastPricedRound = round;
    c.fundingHistory.push({ id: nextId(state, "fr"), round, investorId: "rescue", investorName: RESCUE_INVESTOR, type: "seed", instrument: "rescue", amount, preMoney: pre, postMoney: res.postMoney, equityPct: res.investorPct, boardSeat: true });
    c.reputation.investors = Math.max(0, c.reputation.investors - 15);
    c.reputation.media = Math.max(0, c.reputation.media - 5);
    c.morale = Math.max(0.05, c.morale - 0.1);
    c.founderStress = Math.min(1, c.founderStress + 0.15);
    report.lines.push({
      kind: "bad",
      text: fill(
        lt(
          "You ran out of cash. {n} rescued the company with {a} for {p}% of the shares, a 2x liquidation preference and a board seat.",
          "Hai finito la cassa. {n} ha salvato l'azienda con {a} in cambio del {p}% delle quote, una liquidation preference 2x e un posto nel CdA.",
        ),
        { n: RESCUE_INVESTOR, a: moneyL(amount), p: (res.investorPct * 100).toFixed(0) },
      ),
    });
    return;
  }
  c.status = "bankrupt";
  c.bankruptRound = round;
  c.bankruptReason = lt("The company ran out of cash and nobody was willing to fund it.", "L'azienda ha finito la cassa e nessuno era disposto a finanziarla.");
  c.valuation = 0;
  report.lines.push({ kind: "bad", text: lt("Bankruptcy: the company ran out of cash and had to shut down.", "Fallimento: l'azienda ha finito la cassa e ha dovuto chiudere.") });
}

export { INVESTORS, GRANTS, LENDERS };
