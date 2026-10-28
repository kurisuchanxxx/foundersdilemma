// Interaction between the companies of a game: acquisition bids and partnerships.
// Proposals are made in one round and answered by the other team in the next one.
import { fill, lt, moneyL } from "../text";
import type { AcquisitionOffer, Company, Decision, GameState, RoundReport } from "../types";
import { executeExit } from "./exit";
import { clamp, clamp01, nextId } from "./util";

export type ReportOf = (companyId: string) => RoundReport | undefined;

export const MAX_PARTNERSHIPS = 2;
export const PARTNERSHIP_ROUNDS = 3;

export function activePartnerships(c: Company, round: number) {
  return (c.partnerships ?? []).filter((p) => p.untilRound >= round);
}

/** Sends this round's acquisition bid: the target answers next round. */
export function sendAcquisitionBid(state: GameState, c: Company, d: Decision, round: number, reportOf: ReportOf): void {
  if (!d.acquisitionBid) return;
  const target = state.companies.find((o) => o.id === d.acquisitionBid!.targetId && o.status === "active" && o.id !== c.id);
  if (!target) return;
  const amount = d.acquisitionBid.amount;
  if (c.cash < amount) {
    reportOf(c.id)?.lines.push({ kind: "bad", text: fill(lt("Offer to {t} not sent: you do not have {a} in cash.", "Offerta a {t} non inviata: non avete {a} in cassa."), { t: target.name, a: moneyL(amount) }) });
    return;
  }
  const offer: AcquisitionOffer = { id: nextId(state, "acq"), acquirer: c.name, kind: "team", value: amount, validRound: round + 1, premium: amount / Math.max(1, target.valuation), fromCompanyId: c.id };
  target.acquisitionOffers.push(offer);
  reportOf(c.id)?.lines.push({ kind: "finance", text: fill(lt("Acquisition offer sent to {t}: {a} in cash. They answer next round.", "Offerta di acquisizione inviata a {t}: {a} in contanti. Risponderanno il prossimo round."), { t: target.name, a: moneyL(amount) }) });
  reportOf(target.id)?.lines.push({ kind: "finance", text: fill(lt("{b} offers {a} to acquire your company: you decide next round.", "{b} offre {a} per acquisire la vostra azienda: deciderete nel prossimo round."), { b: c.name, a: moneyL(amount) }) });
}

/** The target accepted a bid from another company: pay, exit and merge. Returns false if the bid is void. */
export function completeTeamAcquisition(state: GameState, target: Company, offer: AcquisitionOffer, round: number, reportOf: ReportOf): boolean {
  const buyer = state.companies.find((o) => o.id === offer.fromCompanyId);
  const report = reportOf(target.id);
  if (!buyer || buyer.status !== "active" || buyer.cash < offer.value) {
    target.acquisitionOffers = target.acquisitionOffers.filter((o) => o.id !== offer.id);
    report?.lines.push({ kind: "bad", text: fill(lt("{b}'s offer is no longer valid: they can no longer pay.", "L'offerta di {b} non è più valida: non sono più in grado di pagare."), { b: offer.acquirer }) });
    return false;
  }
  buyer.cash -= offer.value;
  if (report) executeExit(state, target, offer.value, buyer.name, "team", round, report);
  mergeInto(state, buyer, target, round, reportOf(buyer.id));
  return true;
}

function mergeInto(state: GameState, buyer: Company, target: Company, round: number, report: RoundReport | undefined): void {
  const same = buyer.sector === target.sector;
  let customers = 0;
  if (same) {
    customers = target.customers * 0.85;
    buyer.customers += customers;
    buyer.waitlist += target.waitlist * 0.5;
    if (buyer.product.launched) buyer.mrr = buyer.customers * buyer.price;
    buyer.pmf.problemClarity = clamp01(Math.max(buyer.pmf.problemClarity, (buyer.pmf.problemClarity + target.pmf.problemClarity) / 2));
  }
  if (target.product.quality > buyer.product.quality) buyer.product.quality = (buyer.product.quality + target.product.quality) / 2;
  buyer.brand = clamp01(buyer.brand + target.brand * (same ? 0.5 : 0.2));
  const people = target.team.length;
  for (const e of target.team) {
    buyer.team.push({ ...e, holderId: null, equityPct: 0, hiredRound: round, startMonth: state.month, moraleOffset: e.moraleOffset - 0.05 });
  }
  target.team = [];
  target.customers = 0;
  // buying the company means buying its balance sheet: cash, debts and prepaid contracts come along
  const cash = target.cash;
  const debt = target.loans.reduce((s, l) => s + l.remaining, 0);
  buyer.cash += cash;
  buyer.loans.push(...target.loans);
  buyer.prepayments = [...(buyer.prepayments ?? []), ...(target.prepayments ?? [])];
  target.cash = 0;
  target.loans = [];
  target.prepayments = [];
  buyer.morale = clamp(buyer.morale - 0.03, 0.05, 1);
  report?.lines.push({
    kind: "good",
    text: same
      ? fill(lt("Acquisition of {t} completed: +{c} customers and {n} people join the team.", "Acquisizione di {t} completata: +{c} clienti e {n} persone entrano nel team."), { t: target.name, c: Math.round(customers), n: people })
      : fill(lt("Acquisition of {t} completed: {n} people and their know-how join the team.", "Acquisizione di {t} completata: {n} persone e le loro competenze entrano nel team."), { t: target.name, n: people }),
  });
  if (cash > 0 || debt > 0)
    report?.lines.push({
      kind: "finance",
      text: fill(lt("With {t} you also took over its cash ({c}) and its debts ({d}).", "Con {t} avete rilevato anche la sua cassa ({c}) e i suoi debiti ({d})."), { t: target.name, c: moneyL(cash), d: moneyL(debt) }),
    });
}

/** Sends partnership proposals: the other team answers next round. */
export function sendPartnershipProposals(state: GameState, c: Company, d: Decision, round: number, reportOf: ReportOf): void {
  for (const id of d.partnershipProposals) {
    const target = state.companies.find((o) => o.id === id && o.status === "active" && o.id !== c.id);
    if (!target) continue;
    if (activePartnerships(c, round).length >= MAX_PARTNERSHIPS) {
      reportOf(c.id)?.lines.push({ kind: "info", text: lt("Partnership proposal not sent: you already have the maximum of two partnerships.", "Proposta di partnership non inviata: avete già il massimo di due partnership.") });
      continue;
    }
    target.partnershipOffers.push({ id: nextId(state, "po"), fromCompanyId: c.id, fromName: c.name, validRound: round + 1 });
    reportOf(c.id)?.lines.push({ kind: "info", text: fill(lt("Partnership proposed to {t}: they answer next round.", "Partnership proposta a {t}: risponderanno il prossimo round."), { t: target.name }) });
    reportOf(target.id)?.lines.push({ kind: "info", text: fill(lt("{b} proposes a partnership: you decide next round.", "{b} propone una partnership: deciderete nel prossimo round."), { b: c.name }) });
  }
}

/** Accepts partnership proposals received last round. */
export function acceptPartnerships(state: GameState, c: Company, d: Decision, round: number, reportOf: ReportOf): void {
  for (const id of d.acceptPartnershipIds) {
    const offer = c.partnershipOffers.find((o) => o.id === id && o.validRound >= round);
    c.partnershipOffers = c.partnershipOffers.filter((o) => o.id !== id);
    if (!offer) continue;
    const partner = state.companies.find((o) => o.id === offer.fromCompanyId && o.status === "active");
    if (!partner || activePartnerships(c, round).length >= MAX_PARTNERSHIPS || activePartnerships(partner, round).length >= MAX_PARTNERSHIPS || activePartnerships(c, round).some((p) => p.partnerId === partner.id)) {
      reportOf(c.id)?.lines.push({ kind: "info", text: fill(lt("The partnership with {p} could not start.", "La partnership con {p} non è potuta partire."), { p: offer.fromName }) });
      continue;
    }
    const same = c.sector === partner.sector;
    const until = round + PARTNERSHIP_ROUNDS - 1;
    const effects = same ? { cac: 0.92, churn: 0.95 } : { cac: 0.88, organic: 1.15 };
    for (const [a, b] of [
      [c, partner],
      [partner, c],
    ] as const) {
      a.partnerships.push({ id: nextId(state, "pt"), partnerId: b.id, partnerName: b.name, startRound: round, untilRound: until, sameSector: same });
      a.modifiers.push({ id: nextId(state, "mod"), source: fill(lt("Partnership with {p}", "Partnership con {p}"), { p: b.name }), fromRound: round, untilRound: until, sectors: null, effects: { ...effects } });
      a.brand = clamp01(a.brand + 0.02);
      reportOf(a.id)?.lines.push({
        kind: "good",
        text: same
          ? fill(lt("Alliance with {p} for three rounds: shared roadmap and fewer price fights (CAC -8%, churn -5%).", "Alleanza con {p} per tre round: roadmap condivisa e meno scontri sui prezzi (CAC -8%, churn -5%)."), { p: b.name })
          : fill(lt("Co-marketing partnership with {p} for three rounds: CAC -12%, word of mouth +15%.", "Partnership di co-marketing con {p} per tre round: CAC -12%, passaparola +15%."), { p: b.name }),
      });
    }
  }
}
