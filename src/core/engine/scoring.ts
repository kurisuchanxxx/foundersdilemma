import { lt, type LText } from "../text";
import type { Company, GameState, ScoringMode } from "../types";
import { foundersOwnership, foundersVoting } from "./captable";
import { averageReputation } from "./effects";
import { paperFounderWealth } from "./exit";

export interface Standing {
  companyId: string;
  rank: number;
  score: number;
  founderWealth: number;
  valuation: number;
  ownership: number;
  voting: number;
  boardControl: boolean;
  king: boolean;
  status: Company["status"];
  customers: number;
  mrr: number;
  cash: number;
}

export const SCORING_LABEL: Record<ScoringMode, { name: LText; description: LText }> = {
  founderWealth: {
    name: lt("Founder wealth", "Ricchezza dei fondatori"),
    description: lt(
      "What the founders' shares are worth (exit payout or value at the final valuation, after dilution and liquidation preferences).",
      "Quanto valgono le quote dei fondatori (incasso all'exit o valore alla valutazione finale, dopo diluizione e liquidation preference).",
    ),
  },
  valuation: {
    name: lt("Company valuation", "Valutazione dell'azienda"),
    description: lt("The company's valuation (or exit price). Classic VC-style ranking.", "La valutazione dell'azienda (o il prezzo di exit). Classifica in stile VC."),
  },
  balanced: {
    name: lt("Balanced scorecard", "Scorecard bilanciata"),
    description: lt(
      "Founder wealth 35%, valuation 25%, sustainability 15%, reputation 10%, customer satisfaction 10%, team morale 5%.",
      "Ricchezza dei fondatori 35%, valutazione 25%, sostenibilità 15%, reputazione 10%, soddisfazione clienti 10%, morale del team 5%.",
    ),
  },
};

function lastRunway(c: Company): number {
  const h = c.history[c.history.length - 1];
  return h ? h.runway : 0;
}

export function standings(state: GameState): Standing[] {
  const mode = state.config.scoring;
  const rows = state.companies.map((c) => {
    const wealth = paperFounderWealth(c);
    const voting = c.status === "bankrupt" ? 0 : foundersVoting(c);
    const boardControl = c.board.founders > c.board.investors + c.board.independents;
    return {
      c,
      wealth,
      voting,
      boardControl,
      valuation: c.status === "bankrupt" ? 0 : c.valuation,
    };
  });
  const maxW = Math.max(1, ...rows.map((r) => r.wealth));
  const maxV = Math.max(1, ...rows.map((r) => r.valuation));
  const scored = rows.map((r) => {
    let score: number;
    if (r.c.status === "bankrupt") score = 0;
    else if (mode === "founderWealth") score = r.wealth;
    else if (mode === "valuation") score = r.valuation;
    else {
      const runway = lastRunway(r.c);
      const sustainability = r.c.status === "exited" ? 1 : Math.min(1, runway / 12);
      score =
        100 *
        (0.35 * (r.wealth / maxW) +
          0.25 * (r.valuation / maxV) +
          0.15 * sustainability +
          0.1 * (averageReputation(r.c) / 100) +
          0.1 * ((r.c.nps + 100) / 200) +
          0.05 * r.c.morale);
    }
    return { ...r, score };
  });
  scored.sort((a, b) => b.score - a.score || b.c.cash - a.c.cash);
  return scored.map((r, i) => ({
    companyId: r.c.id,
    rank: i + 1,
    score: r.score,
    founderWealth: r.wealth,
    valuation: r.valuation,
    ownership: r.c.status === "bankrupt" ? 0 : foundersOwnership(r.c),
    voting: r.voting,
    boardControl: r.boardControl,
    king: r.voting > 0.5 && r.boardControl && !r.c.flags.ceoReplaced && r.c.status === "active",
    status: r.c.status,
    customers: r.c.customers,
    mrr: r.c.mrr,
    cash: r.c.cash,
  }));
}
