import { DILEMMAS, dilemmaTemplate, type DilemmaContext, type DilemmaOptionDef, type DilemmaSpecial } from "../data/dilemmas";
import type { Rng } from "../rng";
import { fill, lt, moneyL } from "../text";
import type { Company, DilemmaInstance, GameState, RoundReport } from "../types";
import { addGrant, grantOptions } from "./captable";
import { applyBundle } from "./effects";
import { executeExit } from "./exit";
import { addProfessionalCeo, cofounderLeaves, fireEmployee, resignEmployee } from "./people";
import { nextId } from "./util";

/** Dilemmas that can only happen once per company. */
const ONE_SHOT = new Set(["pivot_or_persevere", "remote_or_office", "open_source_core", "sustainability", "ceo_replacement", "acquihire_offer"]);

export function generateDilemma(state: GameState, c: Company, round: number, netBurn: number, runway: number, rng: Rng): DilemmaInstance | null {
  if (c.status !== "active" || round < 2 || round > state.config.totalRounds) return null;
  const ctx: DilemmaContext = { company: c, state, netBurn, runway };
  const recent = new Set(c.dilemmaHistory.filter((d) => d.round >= round - 3).map((d) => d.templateId));
  const ever = new Set(c.dilemmaHistory.map((d) => d.templateId));
  const pool = DILEMMAS.filter((t) => !recent.has(t.id) && !(ONE_SHOT.has(t.id) && ever.has(t.id)));
  const weights = pool.map((t) => ({ t, w: t.weight(ctx) })).filter((x) => x.w > 0);
  if (weights.length === 0) return null;
  const urgent = weights.some((x) => x.w >= 1.5);
  if (!rng.chance(urgent ? 0.75 : 0.45)) return null;
  const pick = rng.weighted(weights, (x) => x.w);
  if (!pick) return null;
  const t = pick.t;
  const params = t.prepare ? t.prepare(ctx) : {};
  if (params === null) return null;
  // bilingual values (money in each language's format) only go into the texts
  const context = Object.fromEntries(Object.entries(params).filter((e): e is [string, string | number] => typeof e[1] !== "object"));
  return {
    id: nextId(state, "dil"),
    templateId: t.id,
    round,
    title: t.title,
    description: fill(t.description, params),
    options: t.options.map((o) => ({ id: o.id, label: fill(o.label, params), description: fill(o.description, params) })),
    concept: t.concept,
    context,
    chosen: null,
    outcome: null,
  };
}

/** Option used when a team does not answer a dilemma (the passive choice). */
export function defaultOption(d: DilemmaInstance): string {
  if (d.templateId === "ceo_replacement") return "accept";
  return d.options[d.options.length - 1].id;
}

export interface DilemmaResolution {
  exited: boolean;
}

export function resolveDilemma(state: GameState, c: Company, choice: string | null, round: number, rng: Rng, report: RoundReport): DilemmaResolution {
  const d = c.dilemma;
  if (!d) return { exited: false };
  const t = dilemmaTemplate(d.templateId);
  c.dilemma = null;
  if (!t) return { exited: false };
  const optionId = choice && t.options.some((o) => o.id === choice) ? choice : defaultOption(d);
  const opt = t.options.find((o) => o.id === optionId)!;
  d.chosen = optionId;
  let outcome = fill(opt.outcome, d.context);
  if (opt.effects) applyBundle(state, c, opt.effects, d.title, round);
  if (opt.gamble) {
    const branch = rng.chance(opt.gamble.probability) ? opt.gamble.success : opt.gamble.failure;
    applyBundle(state, c, branch.effects, d.title, round);
    outcome = lt(`${outcome.en} ${branch.text.en}`, `${outcome.it} ${branch.text.it}`);
  }
  if (opt.risk) {
    c.pendingRisks.push({
      id: nextId(state, "risk"),
      round: round + opt.risk.delay,
      probability: opt.risk.probability,
      title: opt.risk.title,
      description: opt.risk.description,
      effects: opt.risk.effects,
      concept: t.concept,
      cofounderId: null,
    });
  }
  let exited = false;
  if (opt.special) exited = applySpecial(state, c, d, opt, opt.special, round, rng, report);
  d.outcome = outcome;
  c.dilemmaHistory.push(d);
  report.lines.push({ kind: "info", text: fill(lt("Dilemma '{t}': {o}", "Dilemma '{t}': {o}"), { t: d.title, o: outcome }) });
  return { exited };
}

function applySpecial(state: GameState, c: Company, d: DilemmaInstance, _opt: DilemmaOptionDef, sp: DilemmaSpecial, round: number, rng: Rng, report: RoundReport): boolean {
  const month = state.month;
  switch (sp.kind) {
    case "loseEmployee": {
      const id = String(d.context.employeeId ?? "");
      const e = c.team.find((x) => x.id === id);
      if (e) resignEmployee(state, c, e, month, report);
      return false;
    }
    case "retainEmployee": {
      const e = c.team.find((x) => x.id === String(d.context.employeeId ?? ""));
      if (!e) return false;
      e.salary = Math.round((e.salary * (1 + sp.raisePct)) / 500) * 500;
      e.moraleOffset += 0.05;
      if (sp.equityPct > 0) {
        if (e.holderId) addGrant(c, e.holderId, sp.equityPct, month);
        else e.holderId = grantOptions(state, c, e.name, sp.equityPct, month);
        e.equityPct += sp.equityPct;
      }
      return false;
    }
    case "cofounderLeaves":
      cofounderLeaves(state, c, String(d.context.cofounderId ?? ""), month, round, report, sp.settlement);
      return false;
    case "cofounderRisk":
      c.pendingRisks.push({
        id: nextId(state, "risk"),
        round: round + 1,
        probability: sp.probability,
        title: lt("Your co-founder quits", "Il tuo co-fondatore se ne va"),
        description: lt("The unresolved conflict exploded: your co-founder walked out.", "Il conflitto irrisolto è esploso: il tuo co-fondatore se n'è andato."),
        effects: { morale: -0.1, stress: 0.1 },
        concept: "founderVesting",
        cofounderId: String(d.context.cofounderId ?? ""),
      });
      return false;
    case "pivot": {
      const p = c.pmf;
      p.problemClarity = Math.min(1, Math.max(p.problemClarity, 0.55) + 0.1);
      p.solutionFit *= 0.5;
      p.marketPull = 0.3;
      c.customers *= 0.6;
      c.mrr = c.customers * c.price;
      c.product.quality *= 0.85;
      c.product.techDebt = Math.max(0, c.product.techDebt - 0.1);
      c.brand *= 0.7;
      c.flags.pivoted = true;
      c.flags.pivotRound = round;
      // A pivot informed by customer learning finds a better opportunity on average.
      c.fitPotential = Math.max(c.fitPotential, Math.min(1.12, rng.range(0.75, 1.0) + 0.12 * p.problemClarity));
      return false;
    }
    case "bridge": {
      const amount = Number(d.context.amountValue ?? 0);
      const cap = Number(d.context.capValue ?? 1_000_000);
      if (amount > 0) {
        c.safes.push({ id: nextId(state, "safe"), investorId: "bridge", investorName: "Bridge (existing investors)", amount, cap, round });
        c.cash += amount;
        c.totalRaised += amount;
        c.fundingHistory.push({ id: nextId(state, "fr"), round, investorId: "bridge", investorName: "Bridge (existing investors)", type: "seed", instrument: "safe", amount, preMoney: null, postMoney: cap, equityPct: amount / cap, boardSeat: false });
        c.reputation.investors = Math.max(0, c.reputation.investors - 3);
        report.lines.push({ kind: "finance", text: fill(lt("Bridge round closed: +{a} (SAFE, cap {c}).", "Round ponte chiuso: +{a} (SAFE, cap {c})."), { a: moneyL(amount), c: moneyL(cap) }) });
      }
      return false;
    }
    case "professionalCeo":
      addProfessionalCeo(state, c, round);
      c.founderStress = Math.max(0, c.founderStress - 0.25);
      c.morale = Math.max(0.05, c.morale - 0.03);
      return false;
    case "fightBoard": {
      const foundersControl = c.board.founders > c.board.investors + c.board.independents;
      if (foundersControl || rng.chance(0.3)) {
        c.morale = Math.max(0.05, c.morale - 0.06);
        c.founderStress = Math.min(1, c.founderStress + 0.1);
        c.reputation.investors = Math.max(0, c.reputation.investors - 8);
        report.lines.push({ kind: "info", text: lt("You kept your role as CEO, but the relationship with the board is damaged.", "Hai mantenuto il ruolo di CEO, ma il rapporto con il CdA si è incrinato.") });
      } else {
        addProfessionalCeo(state, c, round);
        c.morale = Math.max(0.05, c.morale - 0.1);
        c.founderStress = Math.min(1, c.founderStress + 0.15);
        report.lines.push({ kind: "bad", text: lt("The board voted you out as CEO. A professional CEO now runs the company.", "Il CdA ti ha rimosso da CEO. Ora l'azienda è guidata da un CEO professionista.") });
      }
      return false;
    }
    case "office":
      c.flags.officeMode = "office";
      return false;
    case "remote":
      c.flags.officeMode = "remote";
      return false;
    case "openSource":
      c.flags.openSource = true;
      return false;
    case "layoffs": {
      const n = Math.max(1, Math.ceil(c.team.length * sp.share));
      const ranked = c.team
        .filter((e) => e.candidateId !== "pro_ceo")
        .map((e) => ({ e, v: Object.values(e.stats).reduce((a, b) => a + b, 0) / (e.salary / 10_000) }))
        .sort((a, b) => a.v - b.v)
        .slice(0, n);
      let severance = 0;
      for (const r of ranked) severance += fireEmployee(state, c, r.e.id, month, report, "layoff");
      c.cash -= severance;
      return false;
    }
    case "salaryCut":
      c.flags.salaryCutUntil = round + sp.rounds - 1;
      c.flags.salaryCutPct = sp.pct;
      return false;
    case "acquihire": {
      const value = Number(d.context.valueAmount ?? 0);
      executeExit(state, c, value, "BigCo (acqui-hire)", "acquihire", round, report);
      return true;
    }
    case "bigClient": {
      const n = Number(d.context.customers ?? 1);
      c.customers += n;
      c.mrr = c.customers * c.price;
      return false;
    }
    case "annualPrepay": {
      // a quarter of customers pay 12 months upfront at a 20% discount: no further payments from them for a year
      const cash = Number(d.context.cashValue ?? 0);
      c.cash += cash;
      c.prepayments = [...(c.prepayments ?? []), { monthly: cash / (12 * 0.8), monthsLeft: 12 }];
      return false;
    }
  }
  return false;
}

/** Resolves delayed consequences due this round. */
export function resolvePendingRisks(state: GameState, c: Company, round: number, rng: Rng, report: RoundReport): void {
  const due = c.pendingRisks.filter((r) => r.round <= round);
  c.pendingRisks = c.pendingRisks.filter((r) => r.round > round);
  for (const r of due) {
    if (!rng.chance(r.probability)) continue;
    applyBundle(state, c, r.effects, r.title, round);
    if (r.cofounderId) cofounderLeaves(state, c, r.cofounderId, state.month, round, report, 0);
    const ev = {
      id: nextId(state, "ev"),
      round,
      scope: "company" as const,
      companyId: c.id,
      sectors: null,
      templateId: "risk",
      title: r.title,
      description: r.description,
      impact: "negative" as const,
      concept: r.concept,
    };
    state.events.push(ev);
    report.eventIds.push(ev.id);
    report.lines.push({ kind: "bad", text: fill(lt("Consequence: {t}. {d}", "Conseguenza: {t}. {d}"), { t: r.title, d: r.description }) });
  }
}
