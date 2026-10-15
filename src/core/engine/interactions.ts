// Founder-to-founder interactions between the teams of a game: shout-outs, mentorship, taunts
// and poaching. They are decided with the round's decisions and resolved before the simulation.
import { INTERACTION_DEFS, MAX_INTERACTIONS } from "../data/gamify";
import { fill, lt } from "../text";
import type { Company, GameState, InteractionRecord, InteractionRequest } from "../types";
import type { SimCtx } from "./context";
import { awardXp } from "./gamify";
import { resignEmployee } from "./people";
import { standings } from "./scoring";
import { clamp, clamp01, nextId } from "./util";

export function relationKey(a: string, b: string): string {
  return [a, b].sort().join("|");
}

export function relation(state: GameState, a: string, b: string): number {
  return state.relations[relationKey(a, b)] ?? 0;
}

function bumpRelation(state: GameState, a: string, b: string, delta: number): void {
  const k = relationKey(a, b);
  state.relations[k] = clamp((state.relations[k] ?? 0) + delta, -5, 5);
}

/** Interactions a company may still submit (valid targets, max two, one per target and kind). */
export function sanitizeInteractions(state: GameState, c: Company, input: InteractionRequest[] | undefined): InteractionRequest[] {
  if (!Array.isArray(input)) return [];
  const out: InteractionRequest[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== "object" || !INTERACTION_DEFS[raw.kind]) continue;
    const target = state.companies.find((o) => o.id === raw.targetId);
    if (!target || target.id === c.id || target.status !== "active") continue;
    if (out.some((o) => o.targetId === target.id && o.kind === raw.kind)) continue;
    let employeeId: string | null = null;
    if (raw.kind === "poach") {
      if (target.team.length === 0) continue;
      employeeId = raw.employeeId && target.team.some((e) => e.id === raw.employeeId && e.candidateId !== "pro_ceo") ? raw.employeeId : null;
    }
    out.push({ kind: raw.kind, targetId: target.id, employeeId });
    if (out.length >= MAX_INTERACTIONS) break;
  }
  return out;
}

/** Resolves every submitted interaction of the round. Effects apply to the companies' state before the months are simulated. */
export function resolveInteractions(state: GameState, ctxs: SimCtx[], round: number): InteractionRecord[] {
  const byId = new Map(ctxs.map((x) => [x.c.id, x]));
  const ranks = new Map(standings(state).map((s) => [s.companyId, s.rank]));
  const records: InteractionRecord[] = [];
  for (const x of ctxs) {
    const c = x.c;
    for (const req of sanitizeInteractions(state, c, x.d.interactions)) {
      const tx = byId.get(req.targetId);
      if (!tx) continue;
      const t = tx.c;
      const rec: InteractionRecord = { id: nextId(state, "ix"), round, kind: req.kind, fromId: c.id, toId: t.id, success: true, text: lt("", ""), xpFrom: 0, xpTo: 0 };
      switch (req.kind) {
        case "shoutout": {
          c.morale = clamp(c.morale + 0.03, 0.05, 1);
          t.morale = clamp(t.morale + 0.03, 0.05, 1);
          c.brand = clamp01(c.brand + 0.005);
          t.brand = clamp01(t.brand + 0.005);
          bumpRelation(state, c.id, t.id, 1);
          rec.xpFrom = 15;
          rec.xpTo = 15;
          rec.text = fill(lt("{a} gave a public shout-out to {b}: both teams are energised.", "{a} ha fatto uno shout-out pubblico a {b}: entrambi i team sono carichi."), { a: c.name, b: t.name });
          break;
        }
        case "mentorship": {
          t.pmf.learningVelocity = clamp01(t.pmf.learningVelocity + 0.05);
          t.morale = clamp(t.morale + 0.02, 0.05, 1);
          x.distraction += 0.03;
          bumpRelation(state, c.id, t.id, 1);
          rec.xpFrom = 40;
          rec.xpTo = 20;
          rec.text = fill(lt("{a} mentored {b}: they will learn from customers faster this round.", "{a} ha fatto da mentor a {b}: impareranno più in fretta dai clienti in questo round."), { a: c.name, b: t.name });
          break;
        }
        case "taunt": {
          const ahead = (ranks.get(c.id) ?? 99) < (ranks.get(t.id) ?? 99);
          bumpRelation(state, c.id, t.id, -1);
          c.reputation.media = clamp(c.reputation.media + (ahead ? 4 : 2), 0, 100);
          if (ahead) {
            t.founderStress = clamp01(t.founderStress + 0.06);
            t.morale = clamp(t.morale - 0.03, 0.05, 1);
            c.brand = clamp01(c.brand + 0.01);
            rec.xpFrom = 25;
            rec.text = fill(lt("{a} taunted {b} in the press: the jab landed and {b} feels the pressure.", "{a} ha punzecchiato {b} sulla stampa: il colpo è arrivato e {b} sente la pressione."), { a: c.name, b: t.name });
          } else {
            rec.success = false;
            c.morale = clamp(c.morale - 0.03, 0.05, 1);
            t.morale = clamp(t.morale + 0.02, 0.05, 1);
            rec.text = fill(lt("{a} taunted {b}, but {b} is ahead: the jab backfired and {b}'s team rallied.", "{a} ha punzecchiato {b}, ma {b} è davanti: lo sfottò si è ritorto contro e il team di {b} si è compattato."), { a: c.name, b: t.name });
          }
          break;
        }
        case "poach": {
          const pool = t.team.filter((e) => e.candidateId !== "pro_ceo");
          const e = pool.find((k) => k.id === req.employeeId) ?? (pool.length > 0 ? x.rng.pick(pool) : null);
          bumpRelation(state, c.id, t.id, -2);
          if (!e) {
            rec.success = false;
            rec.text = fill(lt("{a} tried to poach from {b}, but there was nobody to recruit.", "{a} ha provato a soffiare qualcuno a {b}, ma non c'era nessuno da reclutare."), { a: c.name, b: t.name });
            break;
          }
          const chance = clamp(0.25 + 0.5 * (0.7 - t.morale) + 0.003 * (c.reputation.talent - t.reputation.talent), 0.05, 0.8);
          if (x.rng.chance(chance)) {
            resignEmployee(state, t, e, state.month, tx.report);
            c.team.push({ ...e, salary: Math.round(e.salary * 1.15), equityPct: 0, holderId: null, hiredRound: round, startMonth: state.month, moraleOffset: 0 });
            c.reputation.talent = clamp(c.reputation.talent - 3, 0, 100);
            t.morale = clamp(t.morale - 0.03, 0.05, 1);
            rec.xpFrom = 60;
            rec.text = fill(lt("{a} poached {n} from {b} with a 15% raise.", "{a} ha soffiato {n} a {b} con un aumento del 15%."), { a: c.name, b: t.name, n: e.name });
          } else {
            rec.success = false;
            c.reputation.talent = clamp(c.reputation.talent - 1, 0, 100);
            t.morale = clamp(t.morale + 0.01, 0.05, 1);
            rec.text = fill(lt("{a} tried to poach {n} from {b}: {n} said no and told everyone.", "{a} ha provato a soffiare {n} a {b}: {n} ha detto di no e l'ha raccontato a tutti."), { a: c.name, b: t.name, n: e.name });
          }
          break;
        }
      }
      const def = INTERACTION_DEFS[req.kind];
      if (rec.xpFrom > 0) awardXp(c, rec.xpFrom, round, "interaction", def.title);
      if (rec.xpTo > 0) awardXp(t, rec.xpTo, round, "interaction", def.title);
      x.report.lines.push({ kind: rec.success ? "team" : "bad", text: rec.text });
      tx.report.lines.push({ kind: req.kind === "shoutout" || req.kind === "mentorship" ? "good" : "team", text: rec.text });
      state.interactions.push(rec);
      records.push(rec);
    }
  }
  return records;
}
