import { ACCEPT_THRESHOLD, EXPECTED_EQUITY, PROFESSIONAL_CANDIDATES, ROLE_LABEL, generateCandidate, professionalCandidate } from "../data/candidates";
import type { Rng } from "../rng";
import { fill, lt, type LText, moneyL, decL } from "../text";
import type { Candidate, Company, Employee, GameState, HiringOffer, HiringResult } from "../types";
import { grantOptions } from "./captable";
import type { SimCtx } from "./context";
import { teamTraits } from "./team";
import { clamp, effectiveModifiers, nextId } from "./util";

export interface OfferEvaluation {
  score: number;
  threshold: number;
  reasons: Array<{ text: LText; weight: number }>;
  components: { salary: number; equity: number; stage: number; reputation: number; fit: number; penalties: number };
}

export function expectedEquity(c: Company, cand: Candidate): number {
  const stage = !c.product.launched ? 1.3 : c.pmf.score < 60 ? 1 : c.lastPricedRound !== null && c.valuation > 20_000_000 ? 0.6 : 0.8;
  return EXPECTED_EQUITY[cand.seniority] * stage;
}

export function askSalary(state: GameState, c: Company, cand: Candidate): number {
  const mods = effectiveModifiers(state, c, c.sector, state.round);
  return Math.round((cand.askSalary * mods.salaryAsk) / 500) * 500;
}

/**
 * How attractive an offer is for a candidate (0-1), with the reasons a candidate would give.
 * Port of CandidateAI.swift with a few extra factors.
 */
export function evaluateOffer(state: GameState, c: Company, cand: Candidate, offer: HiringOffer, runwayMonths: number, noise = 0): OfferEvaluation {
  const mods = effectiveModifiers(state, c, c.sector, state.round);
  const ask = askSalary(state, c, cand);
  const prefs = cand.prefs;
  const salary = clamp(0.5 + (offer.salary / ask - 1) * 1.5, 0, 1);
  const expected = expectedEquity(c, cand);
  const equity = offer.equityPct <= 0 ? 0 : clamp(0.5 * Math.pow(offer.equityPct / expected, 0.6), 0, 1);
  const stageRisk = !c.product.launched ? 0.9 : c.pmf.score < 45 ? 0.7 : c.pmf.score < 60 ? 0.55 : c.valuation > 20_000_000 ? 0.25 : 0.4;
  const stage = 1 - Math.abs(stageRisk - prefs.riskTolerance);
  const reputation = c.reputation.talent / 100;
  const fit = Math.min(1, (prefs.preferredSectors.includes(c.sector) ? 1 : 0.5) + (c.flags.officeMode === "remote" ? 0.1 : 0));

  const wEq = 0.1 + 0.15 * prefs.equityAppetite;
  const wSal = 0.45 - 0.15 * prefs.equityAppetite;
  let penalties = 0;
  const reasons: OfferEvaluation["reasons"] = [];
  if (runwayMonths < prefs.minRunwayMonths) {
    const p = 0.12 + 0.015 * (prefs.minRunwayMonths - runwayMonths);
    penalties += p;
    reasons.push({ text: fill(lt("I'm worried about your runway: about {r} months, I need at least {m}.", "Mi preoccupa la vostra runway: circa {r} mesi, me ne servono almeno {m}."), { r: Math.max(0, Math.round(runwayMonths)), m: prefs.minRunwayMonths }), weight: p });
  }
  if (c.morale < 0.5) {
    penalties += 0.08;
    reasons.push({ text: lt("I heard the team morale is low.", "Ho sentito che il morale del team è basso."), weight: 0.08 });
  }
  if (c.founderStress > 0.75) {
    penalties += 0.04;
    reasons.push({ text: lt("The founders seemed exhausted during the interview.", "I fondatori sembravano esausti durante il colloquio."), weight: 0.04 });
  }
  const score = wSal * salary + wEq * equity + 0.12 * stage + 0.15 * reputation + 0.18 * fit - penalties + noise;

  if (salary < 0.4) reasons.push({ text: fill(lt("The salary is below my expectations ({a}/year).", "Lo stipendio è sotto le mie aspettative ({a}/anno)."), { a: moneyL(ask) }), weight: (0.4 - salary) * wSal + 0.05 });
  if (prefs.equityAppetite > 0.55 && equity < 0.35) reasons.push({ text: fill(lt("I expected meaningful equity (around {e}%).", "Mi aspettavo una quota significativa (circa {e}%)."), { e: decL(expected * 100, 1) }), weight: 0.06 * prefs.equityAppetite });
  if (stage < 0.6) {
    reasons.push({
      text: stageRisk > prefs.riskTolerance
        ? lt("It's too risky for me at this stage.", "Per me è troppo rischioso in questa fase.")
        : lt("I'm looking for an earlier-stage adventure.", "Cerco un'avventura in una fase più iniziale."),
      weight: (0.6 - stage) * 0.12,
    });
  }
  if (reputation < 0.3) reasons.push({ text: lt("I don't know your company well enough.", "Non conosco abbastanza la vostra azienda."), weight: 0.03 });
  reasons.sort((a, b) => b.weight - a.weight);

  const traits = teamTraits(c);
  const threshold = ACCEPT_THRESHOLD[cand.seniority] + mods.hiringBar - traits.hiring - (c.flags.officeMode === "remote" ? 0.03 : 0);
  return { score, threshold, reasons, components: { salary, equity, stage, reputation, fit, penalties } };
}

interface OfferEntry {
  x: SimCtx;
  offer: HiringOffer;
  guaranteed: boolean;
}

/** Resolves all hiring offers of the round across companies (candidates choose the best one). */
export function resolveHiring(state: GameState, ctxs: SimCtx[], round: number, runwayOf: (x: SimCtx) => number, rng: Rng): void {
  const byCandidate = new Map<string, OfferEntry[]>();
  const auctions = ctxs[0]?.features.hiringAuctions ?? true;
  for (const x of ctxs) {
    if (x.c.status !== "active") continue;
    const seen = new Set<string>();
    for (const cid of x.d.acceptCounterIds) {
      const co = x.c.counterOffers.find((o) => o.id === cid && o.validRound >= round);
      if (!co) continue;
      seen.add(co.candidateId);
      const list = byCandidate.get(co.candidateId) ?? [];
      list.push({ x, offer: { candidateId: co.candidateId, salary: co.salary, equityPct: co.equityPct }, guaranteed: true });
      byCandidate.set(co.candidateId, list);
    }
    for (const offer of x.d.offers) {
      if (seen.has(offer.candidateId)) continue;
      seen.add(offer.candidateId);
      const list = byCandidate.get(offer.candidateId) ?? [];
      list.push({ x, offer, guaranteed: false });
      byCandidate.set(offer.candidateId, list);
    }
    x.c.counterOffers = [];
  }

  const ids = Array.from(byCandidate.keys()).sort();
  for (const candId of ids) {
    const cand = state.candidates.find((k) => k.id === candId);
    const entries = byCandidate.get(candId)!;
    if (!cand) continue;
    const scored = entries.map((e) => {
      const ev = evaluateOffer(state, e.x.c, cand, e.offer, runwayOf(e.x), rng.normal(0, 0.03));
      const threshold = auctions ? ev.threshold : ev.threshold - 0.08;
      const heldOk = !cand.heldFor || cand.heldFor.companyId === e.x.c.id || cand.heldFor.untilRound < round;
      return { e, ev, threshold, eligible: heldOk, score: e.guaranteed ? 2 : ev.score };
    });
    const winners = scored.filter((s) => s.eligible && (s.e.guaranteed || s.score >= s.threshold)).sort((a, b) => b.score - a.score || b.e.offer.salary - a.e.offer.salary);
    const winner = winners[0];
    if (winner) {
      hire(state, winner.e.x, cand, winner.e.offer, round);
      for (const s of scored) {
        if (s === winner) continue;
        pushResult(s.e.x, {
          candidateId: cand.id,
          candidateName: cand.name,
          outcome: "lostToRival",
          reason: fill(lt("{n} accepted a better offer from {c}.", "{n} ha accettato un'offerta migliore di {c}."), { n: cand.name, c: winner.e.x.c.name }),
          salary: s.e.offer.salary,
          equityPct: s.e.offer.equityPct,
        });
      }
      continue;
    }
    // Nobody convinced the candidate: counter-offer to the closest bidder, reject the rest.
    const best = scored.filter((s) => s.eligible).sort((a, b) => b.score - a.score)[0];
    for (const s of scored) {
      const gap = s.threshold - s.score;
      if (s === best && gap <= 0.08 && auctions) {
        const salary = Math.round((s.e.offer.salary * (1 + gap * 1.5 + 0.05)) / 500) * 500;
        const equityPct = Math.max(s.e.offer.equityPct * 1.3, expectedEquity(s.e.x.c, cand) * 0.5);
        const reason = s.ev.reasons[0]?.text ?? lt("Close, but not quite there.", "Ci siamo quasi, ma non del tutto.");
        s.e.x.c.counterOffers.push({ id: nextId(state, "co"), candidateId: cand.id, candidateName: cand.name, salary, equityPct, validRound: round + 1, reason });
        cand.heldFor = { companyId: s.e.x.c.id, untilRound: round + 1 };
        pushResult(s.e.x, {
          candidateId: cand.id,
          candidateName: cand.name,
          outcome: "counter",
          reason: fill(lt("{n} asks for {s}/year and {e}% equity. Accept the counter-offer next round.", "{n} chiede {s}/anno e {e}% di equity. Puoi accettare la controproposta nel prossimo round."), {
            n: cand.name, s: moneyL(salary), e: decL(equityPct * 100, 2),
          }),
          salary,
          equityPct,
        });
      } else {
        pushResult(s.e.x, {
          candidateId: cand.id,
          candidateName: cand.name,
          outcome: "rejected",
          reason: s.ev.reasons[0]?.text ?? lt("I decided to pass.", "Ho deciso di rinunciare."),
          salary: s.e.offer.salary,
          equityPct: s.e.offer.equityPct,
        });
      }
    }
  }
}

function pushResult(x: SimCtx, r: HiringResult) {
  x.report.hiringResults.push(r);
}

function hire(state: GameState, x: SimCtx, cand: Candidate, offer: HiringOffer, round: number): void {
  const c = x.c;
  const emp: Employee = {
    id: nextId(state, "emp"),
    candidateId: cand.id,
    name: cand.name,
    role: cand.role,
    seniority: cand.seniority,
    salary: offer.salary,
    equityPct: offer.equityPct,
    stats: { ...cand.stats },
    perks: [...cand.perks],
    riskTags: [...cand.riskTags],
    hiddenBonuses: cand.hiddenBonuses.map((b) => ({ ...b })),
    cv: cand.cv,
    hiredRound: round,
    startMonth: state.month,
    holderId: null,
    moraleOffset: cand.riskTags.includes("burnout") ? -0.05 : 0,
  };
  emp.holderId = offer.equityPct > 0 ? grantOptions(state, c, cand.name, offer.equityPct, state.month) : null;
  c.team.push(emp);
  if (cand.seniority !== "Junior" && cand.seniority !== "Mid") c.flags.seniorHires += 1;
  state.candidates = state.candidates.filter((k) => k.id !== cand.id);
  pushResult(x, {
    candidateId: cand.id,
    candidateName: cand.name,
    outcome: "hired",
    reason: fill(lt("{n} joined as {r} ({s}/year{e}).", "{n} è entrato come {r} ({s}/anno{e})."), {
      n: cand.name,
      r: ROLE_LABEL[cand.role],
      s: moneyL(offer.salary),
      e: offer.equityPct > 0 ? fill(lt(" + {x}%", " + {x}%"), { x: decL(offer.equityPct * 100, 2) }) : "",
    }),
    salary: offer.salary,
    equityPct: offer.equityPct,
  });
  if (cand.hiddenBonuses.length > 0) {
    x.report.lines.push({
      kind: "team",
      text: fill(lt("Hidden talent revealed: {n} — {d}", "Talento nascosto rivelato: {n} — {d}"), { n: cand.name, d: cand.hiddenBonuses.map((b) => b.description).join("; ") }),
    });
  }
}

/** Initial job market. */
export function initialCandidates(state: GameState, rng: Rng): Candidate[] {
  const size = targetPoolSize(state);
  const picks = rng.shuffle(PROFESSIONAL_CANDIDATES).slice(0, size);
  for (const p of picks) state.usedCandidateIds.push(p.id);
  return picks.map((p) => professionalCandidate(p, 1));
}

export function targetPoolSize(state: GameState): number {
  return Math.min(30, Math.max(14, 6 + 3 * state.companies.length));
}

/** Some candidates find other jobs, new ones arrive (hand-written ones first, then generated). */
export function refreshCandidates(state: GameState, nextRound: number, rng: Rng): void {
  state.candidates = state.candidates.filter((k) => {
    if (k.heldFor && k.heldFor.untilRound >= nextRound) return true;
    k.heldFor = null;
    return !rng.chance(0.2);
  });
  const target = targetPoolSize(state);
  const unused = PROFESSIONAL_CANDIDATES.filter((p) => !state.usedCandidateIds.includes(p.id));
  const fresh = rng.shuffle(unused);
  while (state.candidates.length < target) {
    const next = fresh.shift();
    if (next) {
      state.usedCandidateIds.push(next.id);
      state.candidates.push(professionalCandidate(next, nextRound));
    } else {
      state.candidateSeq += 1;
      const g = generateCandidate(rng, state.candidateSeq, nextRound);
      state.usedCandidateIds.push(g.id);
      state.candidates.push(g);
    }
  }
}
