import { fill, lt, moneyL } from "../text";
import type { Company, Employee, GameState, RoundReport } from "../types";
import { departHolder, grantOptions, holderById } from "./captable";
import { nextId } from "./util";

/** Lets an employee go with one month of severance. */
export function fireEmployee(_state: GameState, c: Company, empId: string, month: number, report: RoundReport, why: "fired" | "layoff"): number {
  const e = c.team.find((x) => x.id === empId);
  if (!e) return 0;
  const severance = e.salary / 12;
  departHolder(c, e.holderId, month);
  c.team = c.team.filter((x) => x.id !== empId);
  c.reputation.talent = Math.max(0, c.reputation.talent - 2);
  report.lines.push({
    kind: "team",
    text: fill(
      why === "layoff"
        ? lt("{n} was laid off (severance {s}).", "{n} è stato licenziato per riduzione del personale (liquidazione {s}).")
        : lt("{n} left the company (severance {s}).", "{n} ha lasciato l'azienda (liquidazione {s})."),
      { n: e.name, s: moneyL(severance) },
    ),
  });
  return severance;
}

/** An employee resigns (no severance). Unvested equity returns to the pool. */
export function resignEmployee(_state: GameState, c: Company, e: Employee, month: number, report: RoundReport): void {
  const h = holderById(c.capTable, e.holderId);
  const before = h?.shares ?? 0;
  const forfeited = departHolder(c, e.holderId, month);
  c.team = c.team.filter((x) => x.id !== e.id);
  c.morale = Math.max(0.05, c.morale - 0.03);
  report.lines.push({
    kind: "team",
    text:
      before > 0
        ? fill(lt("{n} resigned. {p}% of their options were unvested and returned to the pool.", "{n} si è dimesso. Il {p}% delle sue opzioni non era maturato ed è tornato nel pool."), {
            n: e.name,
            p: before > 0 ? Math.round((forfeited / before) * 100) : 0,
          })
        : fill(lt("{n} resigned.", "{n} si è dimesso."), { n: e.name }),
  });
}

export function cofounderLeaves(_state: GameState, c: Company, founderId: string, month: number, round: number, report: RoundReport, settlement: number): void {
  const f = c.founders.find((x) => x.id === founderId && x.active);
  if (!f) return;
  if (c.founders.filter((x) => x.active).length < 2) return;
  const h = holderById(c.capTable, f.holderId);
  const before = h?.shares ?? 0;
  const forfeited = departHolder(c, f.holderId, month);
  f.active = false;
  f.leftRound = round;
  c.board.founders = Math.max(1, c.board.founders - 1);
  c.cash -= settlement;
  const keptPct = before > 0 ? ((before - forfeited) / before) * 100 : 0;
  report.lines.push({
    kind: "bad",
    text: c.founderVesting
      ? fill(
          lt("{n} left the company. Thanks to founder vesting, {f}% of their shares were bought back: they keep {k}%.", "{n} ha lasciato l'azienda. Grazie al vesting dei fondatori, il {f}% delle sue quote è stato riacquistato: ne conserva il {k}%."),
          { n: f.name, f: Math.round(100 - keptPct), k: Math.round(keptPct) },
        )
      : fill(
          lt("{n} left the company and, without founder vesting, keeps ALL their shares: 'dead equity' on your cap table.", "{n} ha lasciato l'azienda e, senza vesting dei fondatori, conserva TUTTE le sue quote: 'dead equity' nella tua cap table."),
          { n: f.name },
        ),
  });
}

export function addProfessionalCeo(state: GameState, c: Company, round: number): Employee {
  const e: Employee = {
    id: nextId(state, "emp"),
    candidateId: "pro_ceo",
    name: "Laura Ferrante (CEO)",
    role: "Ops",
    seniority: "Principal",
    salary: 150_000,
    equityPct: 0.02,
    stats: { eng: 0, product: 5, design: 1, growth: 4, sales: 6, ops: 9, cs: 4 },
    perks: ["process_builder", "stakeholder_shield"],
    riskTags: ["over_controlling"],
    hiddenBonuses: [],
    cv: {
      age: 48,
      education: { university: "INSEAD", degree: "MBA", field: "General Management", graduated: 2004 },
      experiences: [
        { company: "Scale-up (exited)", role: "CEO", yearsWorked: 6, description: "Scaled a B2B company from 40 to 400 people", isKeyExperience: true },
      ],
      skills: [{ name: "leadership", level: 5 }],
      achievements: ["Two successful exits as CEO"],
    },
    hiredRound: round,
    startMonth: state.month,
    holderId: null,
    moraleOffset: 0,
  };
  e.holderId = grantOptions(state, c, e.name, e.equityPct, state.month);
  c.team.push(e);
  c.flags.ceoReplaced = true;
  return e;
}
