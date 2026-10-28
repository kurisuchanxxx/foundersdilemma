import { SECTORS } from "../data/sectors";
import { fill, lt, moneyL, decL } from "../text";
import type { Company, GameState, Insight, Snapshot } from "../types";
import { foundersOwnership } from "./captable";
import { PMF_THRESHOLD } from "./product";
import { CHASM_PMF, SEGMENTS, estimateWtp, segmentFor, sectorPenetration } from "./market";

const ORDER = { critical: 0, warn: 1, info: 2, good: 3 } as const;

/**
 * Rule-based mentor: reads the KPIs after a round and gives the team actionable advice,
 * each linked to a glossary concept that is discussed in class.
 */
export function mentorInsights(state: GameState, c: Company, snap: Snapshot): Insight[] {
  const s = SECTORS[c.sector];
  const out: Insight[] = [];
  const add = (severity: Insight["severity"], text: ReturnType<typeof lt>, concept: string | null) => out.push({ severity, text, concept });

  if (c.status === "bankrupt") {
    add("critical", lt("The company failed. In the debrief, look for the round where burn and revenue diverged.", "L'azienda è fallita. Nel debriefing cerca il round in cui burn e ricavi hanno iniziato a divergere."), "runway");
    return out;
  }
  if (c.status === "exited") return out;

  if (snap.runway < 3) add("critical", fill(lt("Only {r} months of runway. Raise money, cut costs or reach break-even now.", "Solo {r} mesi di runway. Raccogli capitali, taglia i costi o raggiungi il pareggio subito."), { r: decL(snap.runway, 1) }), "runway");
  else if (snap.runway < 6) add("warn", fill(lt("{r} months of runway: fundraising takes time, start now.", "{r} mesi di runway: il fundraising richiede tempo, inizia ora."), { r: decL(snap.runway, 1) }), "runway");
  else if (snap.netBurn <= 0 && c.product.launched) add("good", lt("You generate more cash than you burn: you control your destiny.", "Generi più cassa di quanta ne bruci: sei padrone del tuo destino."), "defaultAlive");

  if (!c.product.launched) {
    if (state.round >= 3 && c.product.mvpProgress < 0.5)
      add("warn", lt("Still far from launch. More engineering capacity (hires or contractors) or a smaller scope would help.", "Il lancio è ancora lontano. Serve più capacità di sviluppo (assunzioni o contractor) o uno scope più piccolo."), "mvp");
    if (c.pmf.problemClarity < 0.35)
      add("info", lt("Talk to customers before building more: customer discovery raises problem clarity.", "Parla con i clienti prima di costruire altro: la customer discovery aumenta la chiarezza del problema."), "customerDiscovery");
    if (c.product.mvpProgress >= 0.6 && c.product.mvpProgress < 1)
      add("info", lt("Your MVP is usable: launching early teaches you faster, at the cost of a rougher first impression.", "Il tuo MVP è utilizzabile: lanciare presto fa imparare più in fretta, al prezzo di una prima impressione più grezza."), "mvp");
  } else {
    const ratio = snap.cac > 0 ? snap.ltv / snap.cac : 0;
    if (snap.newCustomers > 0 && snap.marketingSpend > 0) {
      if (ratio < 1) add("critical", fill(lt("LTV/CAC is {r}: you lose money on every customer you buy.", "LTV/CAC è {r}: perdi soldi su ogni cliente che acquisti."), { r: decL(ratio, 1) }), "ltvCac");
      else if (ratio < 3) add("warn", fill(lt("LTV/CAC is {r}. Investors look for at least 3.", "LTV/CAC è {r}. Gli investitori cercano almeno 3."), { r: decL(ratio, 1) }), "ltvCac");
      else add("good", fill(lt("Healthy unit economics: LTV/CAC = {r}.", "Unit economics sane: LTV/CAC = {r}."), { r: decL(ratio, 1) }), "ltvCac");
      const gm = snap.revenue > 0 ? snap.grossProfit / snap.revenue : s.grossMargin;
      const payback = snap.cac / Math.max(0.01, snap.price * gm);
      if (payback > 18) add("warn", fill(lt("CAC payback of {m} months: growth will eat a lot of cash.", "CAC payback di {m} mesi: la crescita consumerà molta cassa."), { m: Math.round(payback) }), "cacPayback");
    }
    if (snap.churn > s.baseChurn * 1.6)
      add("warn", fill(lt("Monthly churn is {c}%: improve quality, customer success and fit before pushing acquisition.", "Il churn mensile è al {c}%: migliora qualità, customer success e fit prima di spingere l'acquisizione."), { c: decL(snap.churn * 100, 1) }), "churn");
    const wtp = estimateWtp(state, c);
    if (snap.price > wtp * 1.15) add("warn", fill(lt("Your price ({p}) is above what customers value (~{w}): fewer conversions, more churn.", "Il tuo prezzo ({p}) è sopra il valore percepito (~{w}): meno conversioni, più churn."), { p: moneyL(snap.price), w: moneyL(wtp) }), "pricing");
    else if (snap.price < wtp * 0.7) add("info", fill(lt("Customers would probably pay more than {p}: you may be leaving money on the table.", "I clienti probabilmente pagherebbero più di {p}: potresti lasciare soldi sul tavolo."), { p: moneyL(snap.price) }), "pricing");
    const pen = sectorPenetration(state, s);
    const seg = segmentFor(pen);
    if ((seg === "earlyMajority" || seg === "lateMajority") && c.pmf.score < CHASM_PMF)
      add("warn", lt("Your market is moving to the early majority, which only buys proven products: you are in the chasm.", "Il tuo mercato sta passando alla maggioranza anticipatrice, che compra solo prodotti provati: sei nel 'chasm'."), "chasm");
    else if (seg === "earlyAdopters" && pen >= SEGMENTS.earlyAdopters.upTo - 0.05 && c.pmf.score < CHASM_PMF)
      add(
        "warn",
        fill(
          lt(
            "The market is about to reach the early majority ({p}% adoption, the chasm is at 16%). Mainstream customers only buy proven products: reach PMF {t} before then, or your CAC will jump.",
            "Il mercato sta per arrivare alla maggioranza anticipatrice ({p}% di adozione, il chasm è al 16%). I clienti mainstream comprano solo prodotti provati: raggiungi PMF {t} prima, o il CAC salirà di colpo.",
          ),
          { p: Math.round(pen * 100), t: CHASM_PMF },
        ),
        "chasm",
      );
  }

  if (c.pmf.score >= PMF_THRESHOLD) add("good", lt("Product-market fit! Now scaling acquisition makes sense.", "Product-market fit! Ora ha senso scalare l'acquisizione."), "pmf");
  else if (c.product.launched && c.pmf.score < 40 && state.round >= 5)
    add("warn", lt("Weak product-market fit after many months. Consider whether to pivot or persevere.", "Product-market fit debole dopo molti mesi. Valuta se fare pivot o perseverare."), "pivot");

  if (c.product.techDebt > 0.5) add("warn", lt("Tech debt is slowing you down: dedicate time to pay it down.", "Il debito tecnico ti sta rallentando: dedica tempo a ripagarlo."), "techDebt");
  if (c.product.bugs > 40) add("warn", lt("Too many bugs: customers notice. Invest in quality and operations.", "Troppi bug: i clienti se ne accorgono. Investi in qualità e operations."), "techDebt");
  if (c.team.length > 0 && c.morale < 0.45) add("warn", lt("Team morale is low: people may resign. Look at runway, workload and culture.", "Il morale del team è basso: qualcuno potrebbe dimettersi. Guarda runway, carico di lavoro e cultura."), "culture");
  if (c.founderStress > 0.75) add("warn", lt("Founder stress is very high: decisions get worse and burnout is near.", "Lo stress dei fondatori è altissimo: le decisioni peggiorano e il burnout è vicino."), "founderWellbeing");

  const own = foundersOwnership(c);
  if (own < 0.5 && c.flags.everRaisedEquity) add("info", fill(lt("Founders now own {p}% of the company.", "I fondatori ora possiedono il {p}% dell'azienda."), { p: Math.round(own * 100) }), "dilution");
  if (c.board.founders <= c.board.investors + c.board.independents && c.board.investors > 0)
    add("info", lt("Founders no longer control the board: important decisions need investors' approval.", "I fondatori non controllano più il CdA: le decisioni importanti richiedono l'approvazione degli investitori."), "richVsKing");
  if (c.product.launched && snap.runway > 30 && c.pmf.score >= 55)
    add("info", lt("Lots of runway and good fit: you can invest more aggressively in growth.", "Molta runway e buon fit: puoi investire in modo più aggressivo nella crescita."), "growth");

  out.sort((a, b) => ORDER[a.severity] - ORDER[b.severity]);
  return out.slice(0, 6);
}
