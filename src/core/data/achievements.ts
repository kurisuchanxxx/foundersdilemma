import { lt, type LText } from "../text";
import type { EffectBundle } from "../types";

export interface AchievementDef {
  id: string;
  name: LText;
  description: LText;
  icon: string;
  reward: EffectBundle;
}

// Ported from Gamification.swift and extended.
export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "first_to_pmf", name: lt("First to PMF", "Primo al PMF"), description: lt("First company to reach product-market fit.", "Prima azienda a raggiungere il product-market fit."), icon: "Target", reward: { rep: { investors: 10, media: 8 }, morale: 0.05 } },
  { id: "pmf", name: lt("Product-market fit", "Product-market fit"), description: lt("Reached a PMF score of 60 (40% of users 'very disappointed').", "Raggiunto un punteggio PMF di 60 (40% di utenti 'molto delusi')."), icon: "Crosshair", reward: { rep: { investors: 5 } } },
  { id: "survived_cash_crunch", name: lt("Survived a cash crunch", "Sopravvissuto alla crisi di cassa"), description: lt("Went below 2 months of runway and recovered above 9.", "Sceso sotto 2 mesi di runway e risalito sopra 9."), icon: "Flame", reward: { morale: 0.1 } },
  { id: "successful_pivot", name: lt("Successful pivot", "Pivot riuscito"), description: lt("Pivoted and then reached a PMF score above 50.", "Fatto pivot e poi raggiunto un punteggio PMF sopra 50."), icon: "RefreshCcw", reward: { rep: { investors: 8 } } },
  { id: "unicorn", name: lt("Unicorn", "Unicorno"), description: lt("Reached a €1B valuation.", "Raggiunta una valutazione di 1 miliardo di euro."), icon: "Sparkles", reward: { rep: { media: 20, talent: 20 } } },
  { id: "soonicorn", name: lt("Soonicorn", "Quasi unicorno"), description: lt("Reached a €100M valuation.", "Raggiunta una valutazione di 100 milioni di euro."), icon: "Gem", reward: { rep: { media: 8, talent: 8 } } },
  { id: "hiring_streak", name: lt("A-team", "Squadra di serie A"), description: lt("Hired 5 senior (or higher) people.", "Assunte 5 persone senior (o superiori)."), icon: "UsersRound", reward: { rep: { talent: 10 } } },
  { id: "tech_debt_zero", name: lt("Clean codebase", "Codice pulito"), description: lt("Kept tech debt below 10% for 3 rounds after launch.", "Debito tecnico sotto il 10% per 3 round dopo il lancio."), icon: "BadgeCheck", reward: { quality: 0.02 } },
  { id: "first_profitable", name: lt("Profitability king", "Re della profittabilità"), description: lt("First company to be profitable (positive operating cash flow).", "Prima azienda in utile (cash flow operativo positivo)."), icon: "Crown", reward: { rep: { investors: 10 } } },
  { id: "profitable", name: lt("Profitable", "In utile"), description: lt("Generated more cash than you spent in a round.", "Generato più cassa di quanta spesa in un round."), icon: "CircleDollarSign", reward: { stress: -0.05 } },
  { id: "rocketship", name: lt("Rocketship", "Razzo"), description: lt("Tripled monthly revenue in a single round.", "Triplicato il fatturato mensile in un solo round."), icon: "Rocket", reward: { rep: { media: 8 } } },
  { id: "bootstrapped", name: lt("Bootstrapped", "Bootstrapped"), description: lt("Profitable without ever selling equity.", "In utile senza aver mai ceduto equity."), icon: "Hammer", reward: { rep: { media: 10 }, morale: 0.05 } },
  { id: "cac_master", name: lt("CAC master", "Maestro del CAC"), description: lt("Halved your customer acquisition cost.", "Dimezzato il costo di acquisizione cliente."), icon: "TrendingDown", reward: {} },
  { id: "retention_wizard", name: lt("Retention wizard", "Mago della retention"), description: lt("Monthly churn below 2% for 3 rounds.", "Churn mensile sotto il 2% per 3 round."), icon: "Lock", reward: { rep: { customers: 8 } } },
  { id: "speed_to_market", name: lt("Speed to market", "Velocità di lancio"), description: lt("Launched within the first two rounds.", "Lanciato entro i primi due round."), icon: "Zap", reward: { rep: { media: 4 } } },
  { id: "king", name: lt("King", "Re"), description: lt("Founders still own >50% and control the board at the end of the game.", "A fine partita i fondatori possiedono ancora >50% e controllano il CdA."), icon: "Crown", reward: {} },
  { id: "rich", name: lt("Rich", "Ricco"), description: lt("Founders' stake worth more than €10M at the end.", "A fine partita la quota dei fondatori vale più di 10 milioni di euro."), icon: "Landmark", reward: {} },
  { id: "first_raise", name: lt("First cheque", "Primo assegno"), description: lt("Closed your first external funding.", "Chiuso il primo finanziamento esterno."), icon: "HandCoins", reward: {} },
  { id: "thousand_customers", name: lt("1,000 customers", "1.000 clienti"), description: lt("Served 1,000 paying customers.", "Serviti 1.000 clienti paganti."), icon: "Users", reward: { rep: { customers: 4 } } },
];

export function achievementDef(id: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}
