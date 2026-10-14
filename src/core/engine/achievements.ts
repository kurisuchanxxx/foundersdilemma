import { achievementDef } from "../data/achievements";
import { fill, lt } from "../text";
import type { Company, GameState, RoundReport, Snapshot } from "../types";
import { foundersVoting } from "./captable";
import { applyBundle } from "./effects";
import { paperFounderWealth } from "./exit";
import { PMF_THRESHOLD } from "./product";

function unlock(state: GameState, c: Company, id: string, round: number, report: RoundReport): void {
  if (c.achievements.some((a) => a.id === id)) return;
  const def = achievementDef(id);
  if (!def) return;
  c.achievements.push({ id, round });
  applyBundle(state, c, def.reward, def.name, round);
  report.lines.push({ kind: "good", text: fill(lt("Achievement unlocked: {n}", "Traguardo sbloccato: {n}"), { n: def.name }) });
}

export function checkAchievements(state: GameState, c: Company, round: number, snap: Snapshot, report: RoundReport): void {
  if (c.status === "bankrupt") return;
  const prev = c.history[c.history.length - 2];
  if (c.pmf.score >= PMF_THRESHOLD) {
    unlock(state, c, "pmf", round, report);
    if (!state.firsts.pmf) {
      state.firsts.pmf = c.id;
      unlock(state, c, "first_to_pmf", round, report);
    }
  }
  if (snap.runway < 2) c.flags.wasLowRunway = true;
  if (c.flags.wasLowRunway && snap.runway > 9) unlock(state, c, "survived_cash_crunch", round, report);
  if (c.flags.pivoted && c.pmf.score > 50) unlock(state, c, "successful_pivot", round, report);
  if (c.valuation >= 1e9) unlock(state, c, "unicorn", round, report);
  if (c.valuation >= 1e8) unlock(state, c, "soonicorn", round, report);
  if (c.flags.seniorHires >= 5) unlock(state, c, "hiring_streak", round, report);
  if (c.product.launched) {
    const recent = c.history.slice(-3);
    if (recent.length === 3 && recent.every((h) => h.techDebt < 0.1 && h.mvpProgress >= 1)) unlock(state, c, "tech_debt_zero", round, report);
    if (recent.length === 3 && recent.every((h) => h.churn > 0 && h.churn < 0.02 && h.customers > 0)) unlock(state, c, "retention_wizard", round, report);
  }
  if (snap.netBurn < 0 && c.product.launched) {
    unlock(state, c, "profitable", round, report);
    if (!state.firsts.profitable) {
      state.firsts.profitable = c.id;
      unlock(state, c, "first_profitable", round, report);
    }
    if (!c.flags.everRaisedEquity) unlock(state, c, "bootstrapped", round, report);
  }
  if (prev && prev.mrr > 1_000 && snap.mrr >= prev.mrr * 3) unlock(state, c, "rocketship", round, report);
  if (c.flags.initialCac === null && c.product.launched && snap.cac > 0 && snap.newCustomers > 0) c.flags.initialCac = snap.cac;
  if (c.flags.initialCac && snap.cac > 0 && snap.newCustomers > 0 && snap.cac <= c.flags.initialCac * 0.5) unlock(state, c, "cac_master", round, report);
  if (c.product.launchRound !== null && c.product.launchRound <= 2) unlock(state, c, "speed_to_market", round, report);
  if (c.fundingHistory.length > 0) unlock(state, c, "first_raise", round, report);
  if (c.customers >= 1_000) unlock(state, c, "thousand_customers", round, report);
}

/** End-of-game achievements about the founders' outcome (Wasserman's "rich vs king"). */
export function finalAchievements(state: GameState, c: Company, report: RoundReport): void {
  if (c.status === "bankrupt") return;
  const king = foundersVoting(c) > 0.5 && c.board.founders > c.board.investors + c.board.independents && !c.flags.ceoReplaced;
  if (king && c.status === "active") unlock(state, c, "king", state.round, report);
  if (paperFounderWealth(c) >= 10_000_000) unlock(state, c, "rich", state.round, report);
}
