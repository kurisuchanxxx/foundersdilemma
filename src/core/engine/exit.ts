import { SECTORS } from "../data/sectors";
import type { Rng } from "../rng";
import { fill, lt, moneyShort } from "../text";
import type { AcquisitionOffer, Company, GameState, RoundReport, SectorId } from "../types";
import { founderPayout, waterfall } from "./captable";
import { nextId } from "./util";

const ACQUIRERS: Record<SectorId, string[]> = {
  saas: ["Orbis Software", "Nordwind Holdings", "CloudForge Inc."],
  consumer: ["Pulse Media Group", "Helios Apps", "Lumen Social"],
  ecommerce: ["Mercato Retail Group", "Helios Commerce", "Atlante Brands"],
  deeptech: ["Atlas Industrial", "Vulcan Robotics", "Siderea Systems"],
  fintech: ["Fintegra Bank", "Paylane Group", "Banca Aurea"],
  healthtech: ["Medica Partners", "Asclepio Health", "CuraTech Group"],
  marketplace: ["Agora Holdings", "Bazaar Global", "Altamira Tech"],
  aiinfra: ["Nimbus Cloud", "Quanta AI Corp", "CloudForge Inc."],
};

const PE_FUNDS = ["Pegasus Capital Partners", "Ironbridge Equity", "Laguna PE"];

export function generateAcquisitionOffers(state: GameState, c: Company, round: number, netBurn: number, rng: Rng): void {
  c.acquisitionOffers = c.acquisitionOffers.filter((o) => o.validRound >= round + 1);
  if (c.status !== "active" || round + 1 > state.config.totalRounds || round < 3) return;
  const arr = c.mrr * 12;
  if (c.valuation < 5_000_000 && arr < 1_000_000) return;
  const s = SECTORS[c.sector];
  const corporate = c.fundingHistory.find((f) => f.type === "corporate");
  const signaling = corporate ? 0.4 : 0;
  let p = (0.03 + 0.015 * (round - 2)) * s.mnaHeat * (1 - signaling) * (c.pmf.score >= 60 ? 1.3 : 1);
  if (corporate) p += 0.08; // the corporate investor itself may buy
  if (!rng.chance(Math.min(0.4, p))) return;

  let acquirer: string;
  let kind: AcquisitionOffer["kind"];
  let premium: number;
  if (corporate && rng.chance(0.5)) {
    acquirer = corporate.investorName;
    kind = "strategic";
    premium = rng.range(1.1, 1.6);
  } else if (netBurn <= 0 && rng.chance(0.35)) {
    acquirer = rng.pick(PE_FUNDS);
    kind = "financial";
    premium = rng.range(0.9, 1.3);
  } else {
    acquirer = rng.pick(ACQUIRERS[c.sector]);
    kind = "strategic";
    premium = rng.range(0.95, 1.8) * Math.min(1.15, s.mnaHeat);
  }
  const value = Math.round((c.valuation * premium) / 100_000) * 100_000;
  c.acquisitionOffers.push({ id: nextId(state, "acq"), acquirer, kind, value, validRound: round + 1, premium });
}

export function executeExit(_state: GameState, c: Company, value: number, acquirer: string, kind: AcquisitionOffer["kind"], round: number, report: RoundReport): void {
  const payouts = waterfall(c, value);
  const fp = founderPayout(c, payouts);
  c.status = "exited";
  c.exit = { round, value, acquirer, kind, payouts, founderPayout: fp };
  c.valuation = value;
  c.acquisitionOffers = [];
  c.termSheets = [];
  report.lines.push({
    kind: "good",
    text: fill(
      lt("EXIT! {a} acquired the company for {v}. The founders receive {f} after liquidation preferences and dilution.", "EXIT! {a} ha acquisito l'azienda per {v}. I fondatori ricevono {f} dopo liquidation preference e diluizione."),
      { a: acquirer, v: moneyShort(value), f: moneyShort(fp) },
    ),
  });
}

export function acceptAcquisition(state: GameState, c: Company, offerId: string, round: number, report: RoundReport): boolean {
  const o = c.acquisitionOffers.find((x) => x.id === offerId && x.validRound >= round);
  if (!o) return false;
  executeExit(state, c, o.value, o.acquirer, o.kind, round, report);
  return true;
}

/** Founders' payout if the company were sold today at its valuation ("paper wealth"). */
export function paperFounderWealth(c: Company): number {
  if (c.status === "bankrupt") return 0;
  if (c.status === "exited" && c.exit) return c.exit.founderPayout;
  return founderPayout(c, waterfall(c, c.valuation));
}
