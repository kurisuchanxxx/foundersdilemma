import { investorDef, lenderDef, grantDef } from "../data/investors";
import { SECTORS } from "../data/sectors";
import { lt, type LText } from "../text";
import type { Company, Decision, GameState, GtmChannel, ReputationAction } from "../types";
import { sanitizeInteractions } from "./interactions";
import { headcount } from "./util";

export const REPUTATION_ACTIONS: Record<ReputationAction, { cost: number; distraction: number; label: LText; description: LText }> = {
  none: { cost: 0, distraction: 0, label: lt("No action", "Nessuna azione"), description: lt("Focus on the product.", "Concentrati sul prodotto.") },
  pr: {
    cost: 20_000,
    distraction: 0.02,
    label: lt("PR campaign", "Campagna PR"),
    description: lt("Press office and media relations: media reputation and brand up.", "Ufficio stampa e media relations: reputazione mediatica e brand in crescita."),
  },
  conference: {
    cost: 10_000,
    distraction: 0.03,
    label: lt("Conference & events", "Conferenze ed eventi"),
    description: lt("Speak at industry events: investors and talent notice you.", "Intervieni a eventi di settore: investitori e talenti ti notano."),
  },
  community: {
    cost: 3_000,
    distraction: 0.05,
    label: lt("Community building", "Community building"),
    description: lt("Meetups and user groups: cheap, but takes founders' time.", "Meetup e gruppi di utenti: costa poco, ma richiede tempo ai fondatori."),
  },
};

export const MAX_OFFERS = 5;
export const MAX_PITCHES = 2;
export const MAX_MONTHLY_BUDGET = 3_000_000;

function niceRound(v: number): number {
  if (v < 10) return Math.round(v * 100) / 100;
  if (v < 100) return Math.round(v);
  if (v < 1_000) return Math.round(v / 5) * 5;
  return Math.round(v / 50) * 50;
}

export function bestGtm(c: Company): GtmChannel {
  const s = SECTORS[c.sector];
  const entries = Object.entries(s.gtmFit) as Array<[GtmChannel, number]>;
  entries.sort((a, b) => a[1] - b[1]);
  return entries[0][0];
}

export function defaultDecision(c: Company): Decision {
  const s = SECTORS[c.sector];
  return {
    rdBudget: 2_000,
    marketingBudget: c.product.launched ? 4_000 : 1_000,
    opsBudget: 500,
    price: niceRound(c.price > 0 ? c.price : s.refPrice * 0.9),
    gtm: bestGtm(c),
    devApproach: "balanced",
    discovery: "light",
    techDebtAction: "maintain",
    launchNow: false,
    founderHours: 50,
    vacation: false,
    reputationAction: "none",
    teamOffsite: false,
    offers: [],
    acceptCounterIds: [],
    fires: [],
    pitches: [],
    acceptTermSheetIds: [],
    grantApplication: null,
    loanRequest: null,
    acceptAcquisitionId: null,
    dilemmaChoice: null,
    targetSegment: c.segment ?? "broad",
    pricingModel: c.pricingModel ?? "subscription",
    acquisitionBid: null,
    partnershipProposals: [],
    acceptPartnershipIds: [],
    interactions: [],
  };
}

/** The decision a team starts from: last round's settings with one-off actions cleared. */
export function carryOverDecision(c: Company): Decision {
  const base = c.lastDecision ? structuredClone(c.lastDecision) : defaultDecision(c);
  return {
    ...base,
    price: base.price || defaultDecision(c).price,
    launchNow: false,
    vacation: false,
    reputationAction: "none",
    teamOffsite: false,
    offers: [],
    acceptCounterIds: [],
    fires: [],
    pitches: [],
    acceptTermSheetIds: [],
    grantApplication: null,
    loanRequest: null,
    acceptAcquisitionId: null,
    dilemmaChoice: null,
    targetSegment: c.segment ?? base.targetSegment ?? "broad",
    pricingModel: c.pricingModel ?? base.pricingModel ?? "subscription",
    acquisitionBid: null,
    partnershipProposals: [],
    acceptPartnershipIds: [],
    interactions: [],
  };
}

function finite(v: number, fallback: number): number {
  return Number.isFinite(v) ? v : fallback;
}

/** Clamps numbers and removes invalid references. Used for every submitted decision. */
export function sanitizeDecision(state: GameState, c: Company, input: Decision): Decision {
  const s = SECTORS[c.sector];
  const d: Decision = { ...defaultDecision(c), ...structuredClone(input) };
  d.rdBudget = Math.min(MAX_MONTHLY_BUDGET, Math.max(0, finite(d.rdBudget, 0)));
  d.marketingBudget = Math.min(MAX_MONTHLY_BUDGET, Math.max(0, finite(d.marketingBudget, 0)));
  d.opsBudget = Math.min(MAX_MONTHLY_BUDGET, Math.max(0, finite(d.opsBudget, 0)));
  d.price = Math.min(s.priceMax, Math.max(s.priceMin, finite(d.price, s.refPrice)));
  if (![40, 50, 60, 80].includes(d.founderHours)) d.founderHours = 50;
  const seen = new Set<string>();
  d.offers = d.offers
    .filter((o) => {
      const cand = state.candidates.find((k) => k.id === o.candidateId);
      if (!cand || seen.has(o.candidateId)) return false;
      if (cand.heldFor && cand.heldFor.companyId !== c.id && cand.heldFor.untilRound >= state.round) return false;
      seen.add(o.candidateId);
      return true;
    })
    .slice(0, MAX_OFFERS)
    .map((o) => ({ ...o, salary: Math.max(10_000, finite(o.salary, 30_000)), equityPct: Math.min(0.1, Math.max(0, finite(o.equityPct, 0))) }));
  d.acceptCounterIds = d.acceptCounterIds.filter((id) => c.counterOffers.some((co) => co.id === id && co.validRound >= state.round));
  d.fires = d.fires.filter((id) => c.team.some((e) => e.id === id));
  d.pitches = d.pitches
    .filter((p) => investorDef(p.investorId) && p.amount > 0 && p.valuation > 0)
    .filter((p, i, arr) => arr.findIndex((q) => q.investorId === p.investorId) === i)
    .slice(0, MAX_PITCHES);
  d.acceptTermSheetIds = d.acceptTermSheetIds.filter((id) => c.termSheets.some((t) => t.id === id && t.validRound >= state.round));
  if (d.grantApplication && !grantDef(d.grantApplication)) d.grantApplication = null;
  if (d.loanRequest && (!lenderDef(d.loanRequest.lenderId) || !(d.loanRequest.amount > 0))) d.loanRequest = null;
  if (d.acceptAcquisitionId && !c.acquisitionOffers.some((o) => o.id === d.acceptAcquisitionId && o.validRound >= state.round)) d.acceptAcquisitionId = null;
  if (d.dilemmaChoice && !(c.dilemma && c.dilemma.options.some((o) => o.id === d.dilemmaChoice))) d.dilemmaChoice = null;
  if (c.product.launched) d.launchNow = false;
  if (!["niche", "broad", "premium"].includes(d.targetSegment)) d.targetSegment = c.segment ?? "broad";
  if (!["subscription", "freemium", "usage"].includes(d.pricingModel)) d.pricingModel = c.pricingModel ?? "subscription";
  const others = state.companies.filter((o) => o.id !== c.id && o.status === "active");
  if (d.acquisitionBid) {
    const target = others.find((o) => o.id === d.acquisitionBid!.targetId);
    const amount = finite(d.acquisitionBid.amount, 0);
    d.acquisitionBid = target && amount > 0 ? { targetId: target.id, amount: Math.round(amount) } : null;
  }
  d.partnershipProposals = (d.partnershipProposals ?? [])
    .filter((id) => others.some((o) => o.id === id) && !c.partnerships.some((p) => p.partnerId === id && p.untilRound >= state.round))
    .slice(0, 1);
  d.acceptPartnershipIds = (d.acceptPartnershipIds ?? []).filter((id) => c.partnershipOffers.some((o) => o.id === id && o.validRound >= state.round));
  d.interactions = sanitizeInteractions(state, c, d.interactions);
  return d;
}

/** One-off costs paid at the start of the round. */
export function oneOffCosts(c: Company, d: Decision): number {
  let cost = REPUTATION_ACTIONS[d.reputationAction].cost;
  if (d.teamOffsite) cost += 1_000 * headcount(c);
  for (const id of d.fires) {
    const e = c.team.find((x) => x.id === id);
    if (e) cost += e.salary / 12;
  }
  return cost;
}
