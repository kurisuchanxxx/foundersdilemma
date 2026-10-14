import { fill, lt } from "../text";
import type { DevApproach, DiscoveryLevel, TechDebtAction } from "../types";
import type { SimCtx } from "./context";
import { clamp, clamp01 } from "./util";

export const APPROACH: Record<DevApproach, { speed: number; debt: number; bugs: number; launchQuality: number }> = {
  rush: { speed: 1.35, debt: 0.18, bugs: 30, launchQuality: -0.05 },
  balanced: { speed: 1.0, debt: 0.09, bugs: 15, launchQuality: 0 },
  quality: { speed: 0.8, debt: 0.04, bugs: 6, launchQuality: 0.08 },
};

export const DISCOVERY: Record<DiscoveryLevel, { clarity: number; cost: number; distraction: number; learning: number }> = {
  none: { clarity: 0, cost: 0, distraction: 0, learning: 0 },
  light: { clarity: 0.018, cost: 1_000, distraction: 0.05, learning: 0.1 },
  deep: { clarity: 0.045, cost: 3_000, distraction: 0.12, learning: 0.22 },
};

export const REFACTOR: Record<TechDebtAction, { share: number; debtMult: number }> = {
  ship: { share: 0, debtMult: 1.3 },
  maintain: { share: 0.1, debtMult: 1 },
  paydown: { share: 0.25, debtMult: 1 },
};

/** Effective development output of the month after debt, approach and distractions. */
export function effectiveDev(x: SimCtx): number {
  const velocity = x.features.techDebt ? 1 - 0.6 * x.c.product.techDebt : 1;
  const approach = APPROACH[x.d.devApproach].speed;
  const discovery = DISCOVERY[x.d.discovery].distraction;
  return x.cap.devPower * velocity * approach * (1 - clamp(x.distraction + discovery, 0, 0.6));
}

export function launchQuality(x: SimCtx): number {
  const p = x.c.product;
  const design = Math.min(0.08, x.cap.stats.design * 0.005);
  return clamp(0.3 + 0.3 * Math.min(1, p.mvpProgress) + APPROACH[x.d.devApproach].launchQuality + design + x.cap.traits.quality, 0.2, 0.85);
}

/** Launches the product when the MVP is complete (or early if requested and >= 50%). */
export function maybeLaunch(x: SimCtx, round: number): boolean {
  const p = x.c.product;
  if (p.launched) return false;
  const ready = p.mvpProgress >= 1 || (x.d.launchNow && p.mvpProgress >= 0.5);
  if (!ready) return false;
  p.launched = true;
  p.launchRound = round;
  p.quality = launchQuality(x);
  x.launchedThisRound = true;
  const early = p.mvpProgress < 1;
  x.report.lines.push({
    kind: "product",
    text: early
      ? fill(lt("You launched early at {pct}% of the MVP. Quality is rough, but real customers will teach you a lot.", "Hai lanciato in anticipo, al {pct}% dell'MVP. La qualità è grezza, ma i clienti veri ti insegneranno molto."), { pct: Math.round(p.mvpProgress * 100) })
      : lt("Launch! Your MVP is live and customers can now pay for it.", "Lancio! Il tuo MVP è online e i clienti ora possono pagarlo."),
  });
  if (early) x.c.pmf.learningVelocity = clamp01(x.c.pmf.learningVelocity + 0.08);
  return true;
}

/** One month of product work. */
export function productMonth(x: SimCtx): void {
  const c = x.c;
  const p = c.product;
  const sector = x.sector;
  const dev = effectiveDev(x);
  const refactor = REFACTOR[x.d.techDebtAction];
  const share = x.features.techDebt ? refactor.share : 0;
  const devFeatures = dev * (1 - share);
  const refactorPts = dev * share;
  const work = devFeatures / sector.mvpEffort;

  if (!p.launched) {
    p.mvpProgress = Math.min(1, p.mvpProgress + work);
  } else {
    const qMult = 1 + x.cap.traits.quality * 2;
    const gain = Math.sqrt(work) * 0.06 * (1 - p.quality) * qMult * Math.sqrt(x.cap.mult.quality) + Math.min(15, x.cap.stats.design) * 0.001 * (1 - p.quality);
    p.quality = clamp(p.quality + gain - 0.005 - p.bugs * 0.0003, 0.05, 1);
  }

  if (x.features.techDebt) {
    const contractorShare = x.cap.devPower > 0 ? x.cap.contractorPower / x.cap.devPower : 0;
    // Debt grows less than linearly with output (bigger codebases), paying it down is easier when there is a lot of it.
    const accrual =
      Math.sqrt(work) * 0.45 * APPROACH[x.d.devApproach].debt * refactor.debtMult * (1 - 0.3 * x.cap.seniorEngShare) * (1 + x.cap.traits.techDebt) * (1 + 0.8 * contractorShare);
    const paydown = (refactorPts / sector.mvpEffort) * 2 * (0.2 + p.techDebt) + x.cap.opsPts * 0.0004;
    p.techDebt = clamp(p.techDebt + clamp(accrual - paydown, -0.08, 0.08), 0, 1);
    const newBugs = Math.sqrt(work) * 0.5 * APPROACH[x.d.devApproach].bugs * (1 + p.techDebt) * (1 + x.cap.traits.bugs);
    const fixed = p.bugs * 0.15 + x.cap.opsPts * 0.25 + refactorPts * 0.05;
    p.bugs = clamp(p.bugs + newBugs - fixed, 0, 100);
  } else {
    p.techDebt = 0;
    p.bugs = clamp(p.bugs * 0.85, 0, 100);
  }

  updatePmf(x, devFeatures);
}

function updatePmf(x: SimCtx, devFeatures: number): void {
  const c = x.c;
  const pmf = c.pmf;
  const p = c.product;
  const disc = x.d.discovery;
  const discovery = DISCOVERY[disc].clarity;
  const learnBoost = 1 + x.cap.traits.learning;

  // Problem clarity: customer discovery and (after launch) feedback from real customers.
  let pc = pmf.problemClarity;
  pc += discovery * (1 - pc) * learnBoost;
  if (p.launched) {
    const scale = Math.min(1, Math.log10(1 + c.customers) / 2.5);
    pc += 0.012 * pmf.learningVelocity * (1 - pc) * scale * learnBoost;
  }
  pc -= 0.005;
  pmf.problemClarity = clamp01(pc);

  // Learning velocity
  const analytics = Math.min(0.15, (x.cap.stats.growth + x.cap.stats.product) / 120);
  const lvTarget = clamp01(
    0.25 + DISCOVERY[disc].learning + analytics + (p.launched ? 0.12 : 0) - (x.features.techDebt ? 0.2 * p.techDebt : 0) + x.cap.traits.learning,
  );
  pmf.learningVelocity = clamp01(pmf.learningVelocity + (lvTarget - pmf.learningVelocity) * 0.2);

  // Solution fit converges to what the team understands and can build.
  const build = p.launched ? p.quality : 0.25 + 0.4 * p.mvpProgress;
  const sfTarget = Math.pow(pmf.problemClarity, 0.8) * (0.25 + 0.75 * build) * c.fitPotential;
  const speed = (0.06 + 0.12 * pmf.learningVelocity) * clamp(0.5 + devFeatures / (0.15 * x.sector.mvpEffort), 0.5, 1.6);
  pmf.solutionFit = clamp01(pmf.solutionFit + (sfTarget - pmf.solutionFit) * speed);

  // Market pull
  const hype = x.mods.demand;
  let mpTarget: number;
  if (!p.launched) {
    const wl = Math.min(0.25, (c.waitlist / Math.max(1, x.sector.tam * 0.002)) * 0.25);
    mpTarget = 0.15 + wl + 0.2 * c.brand + 0.05 * (hype - 1);
  } else {
    const retentionQ = clamp01(1 - c.churn / (2 * x.sector.baseChurn));
    mpTarget = 0.2 + 0.35 * retentionQ + 0.25 * Math.min(1, x.organicShare * 2.5) + 0.15 * c.brand + 0.05 * (hype - 1);
  }
  pmf.marketPull = clamp01(pmf.marketPull + (clamp01(mpTarget) - pmf.marketPull) * 0.15);

  pmf.score = pmfScore(c, x.sector.baseChurn);
}

export function pmfScore(c: { pmf: { problemClarity: number; solutionFit: number; marketPull: number; learningVelocity: number }; product: { launched: boolean }; churn: number }, baseChurn: number): number {
  const p = c.pmf;
  let score = 100 * (0.32 * p.problemClarity + 0.38 * p.solutionFit + 0.2 * p.marketPull + 0.1 * p.learningVelocity);
  if (c.product.launched) {
    const retentionQ = clamp01(1 - c.churn / (2 * baseChurn));
    score = 0.85 * score + 15 * retentionQ;
  }
  return clamp(score, 0, 100);
}

/** Share of users who would be "very disappointed" without the product (Sean Ellis test). */
export function seanEllisShare(score: number): number {
  return clamp01(0.05 + score * 0.0058);
}

export const PMF_THRESHOLD = 60;

export type PmfStage = "searching" | "earlySignals" | "promising" | "achieved" | "strong";

export function pmfStage(score: number): PmfStage {
  if (score < 20) return "searching";
  if (score < 40) return "earlySignals";
  if (score < PMF_THRESHOLD) return "promising";
  if (score < 80) return "achieved";
  return "strong";
}
