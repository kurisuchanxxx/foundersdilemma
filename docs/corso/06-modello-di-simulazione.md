# Il modello di simulazione

Questo capitolo descrive come il motore calcola i risultati, con i parametri effettivamente usati nel codice (`src/core`). Serve al docente per spiegare i risultati in aula e a chi valuta la proposta per verificarne la solidità. I riferimenti tra parentesi indicano il file del motore.

## 1. Principi

- **Deterministico e riproducibile.** Ogni estrazione casuale usa un generatore sfc32 con seed derivato da (seed della partita, round, scopo, azienda). Stesso seed, stesse squadre e stesse decisioni producono la stessa partita (`rng.ts`).
- **Flussi casuali separati.** Eventi di mercato, eventi aziendali, bot, dilemmi e assunzioni hanno flussi distinti: le decisioni di un team non cambiano gli eventi casuali di un altro (c'è un test automatico per questo). I team interagiscono solo attraverso il mercato condiviso, la concorrenza e le aste per i candidati.
- **Simulazione mensile.** Le decisioni si prendono per round, ma il motore simula mese per mese all'interno del round: cassa, clienti, PMF e team evolvono in modo continuo.
- **Anteprima onesta.** La proiezione mostrata mentre si decide usa una copia dello stato e un generatore a valore atteso (le probabilità valgono come *no*, il rumore come la sua media), quindi indica la tendenza senza rivelare gli esiti casuali.

## 2. Tempo

| Piano | Durata dei round | Partita standard (10 round) |
|---|---|---|
| Startup (predefinito) | Round 1-4 trimestrali, poi semestrali | 4 × 3 + 6 × 6 = 48 mesi |
| Trimestri | 3 mesi | 30 mesi |
| Semestri | 6 mesi | 60 mesi |

I round possono essere da 4 a 16. Sequenza di un round (`engine/round.ts`): decisioni una tantum (acquisizione, dilemma, licenziamenti, reputazione, bandi, term sheet, pitch, prestiti, prezzo), poi le aste per le assunzioni di tutti i team insieme, poi i mesi simulati (capacità del team, prodotto, mercato per settore con tutti i team, finanza, brand, team, eventi aziendali), infine controllo di solvibilità, valutazione, obiettivi e commenti del mentor.

## 3. Fondazione

### Settori

| Settore | Cassa iniziale | Sforzo MVP | Mercato (TAM, clienti) | Disponibilità a pagare / mese | Elasticità | CAC base | Churn mensile | Margine lordo | Multiplo ARR |
|---|---|---|---|---|---|---|---|---|---|
| SaaS B2B | 80k | 60 | 40.000 | 300 | 0,9 | 3.840 | 3% | 80% | 7 |
| App consumer | 60k | 45 | 3.000.000 | 6 | 1,4 | 30 | 8% | 85% | 5 |
| E-commerce D2C | 90k | 50 | 1.500.000 | 35 | 1,3 | 80 | 10% | 45% | 3 |
| DeepTech | 120k | 160 | 1.500 | 9.000 | 0,6 | 192.000 | 1,5% | 60% | 7 |
| Fintech | 100k | 90 | 800.000 | 12 | 1,1 | 95 | 4% | 65% | 6 |
| HealthTech | 100k | 110 | 20.000 | 900 | 0,7 | 17.600 | 2% | 72% | 7 |
| Marketplace | 70k | 70 | 1.000.000 | 8 | 1,2 | 40 | 7% | 85% | 5,5 |
| Infrastruttura AI | 100k | 80 | 60.000 | 600 | 0,8 | 5.280 | 3,5% | 55% | 8,5 |

Ogni settore ha inoltre viralità, effetti di rete, dipendenza dalla forza vendita, costi di compliance (fintech, health, deeptech), numero di concorrenti esterni, interesse per le acquisizioni e un moltiplicatore di CAC per ciascun canale (`data/sectors.ts`). La scelta del settore è quindi una scelta di **modello di business**: un DeepTech ha pochi clienti molto costosi da acquisire e tanto tempo prima del lancio; un'app consumer ha milioni di clienti a basso prezzo e churn alto.

### Archetipi dei fondatori

Moltiplicatori su R&S / marketing / vendite / operations / qualità / fundraising (`data/founders.ts`):

| Archetipo | Moltiplicatori |
|---|---|
| Hacker | 1,5 / 0,8 / 0,7 / 0,9 / 1,4 / 1,0 |
| Hustler | 0,9 / 1,4 / 1,5 / 1,0 / 0,9 / 1,3 |
| Designer | 1,1 / 1,3 / 0,9 / 0,8 / 1,5 / 1,1 |
| Analista | 1,0 / 1,2 / 1,0 / 1,3 / 1,0 / 1,0 |
| Visionario | 1,2 / 1,1 / 1,0 / 0,7 / 1,3 / 1,5 |
| Operativo | 1,0 / 1,0 / 1,2 / 1,5 / 1,0 / 0,9 |

Con due fondatori vale, per ogni dimensione, il **migliore dei due**: è la ragione economica per cercare co-fondatori complementari (Wasserman). La società nasce con 10 milioni di azioni divise secondo la scelta del team; il vesting dei fondatori (facoltativo) dura 48 mesi con cliff di 12: chi lascia prima perde le azioni non maturate.

## 4. Prodotto e product-market fit

**Capacità di sviluppo** = (ingegneria + 0,5 × prodotto + 0,3 × design) × coordinamento × leadership dei fondatori + contractor. Le persone rendono di più con morale alto; i junior rendono l'85% senza un mentor; i nuovi assunti impiegano due mesi a entrare a regime; il coordinamento cala oltre i 6 dipendenti (`engine/team.ts`).

**Sviluppo effettivo** = capacità × (1 − 0,6 × debito tecnico) × velocità dell'approccio × (1 − distrazione). L'avanzamento dell'MVP cresce ogni mese di sviluppo / sforzo MVP del settore.

| Approccio | Velocità | Debito tecnico | Bug | Qualità al lancio |
|---|---|---|---|---|
| Veloce | 1,35 | alto | molti | −0,05 |
| Bilanciato | 1,0 | medio | medi | 0 |
| Qualità | 0,8 | basso | pochi | +0,08 |

Il lancio avviene al 100% dell'MVP oppure, su decisione, dal 50%: lanciare presto aumenta la velocità di apprendimento. Il debito tecnico rallenta lo sviluppo e genera bug, che aumentano il churn; si riduce dedicando il 10% (manutenzione) o il 25% (rientro) del tempo al refactoring.

**Customer discovery**: leggera (1.000 €/mese) o profonda (3.000 €/mese) aumenta la chiarezza del problema e la velocità di apprendimento, al prezzo di un po' di distrazione.

**Il punteggio di PMF** (0-100) combina quattro dimensioni (`engine/product.ts`):

```
PMF = 100 × (0,32 × chiarezza del problema + 0,38 × aderenza della soluzione
             + 0,20 × attrazione del mercato + 0,10 × velocità di apprendimento)
dopo il lancio: PMF = 0,85 × PMF + 15 × qualità della retention
```

- La **chiarezza del problema** cresce con la discovery e, dopo il lancio, con l'apprendimento dai clienti.
- L'**aderenza della soluzione** tende a chiarezza^0,8 × qualità del prodotto × un potenziale nascosto dell'idea (estratto all'inizio tra 0,72 e 1,08): anche un ottimo team può aver scelto un'idea con meno potenziale, e un pivot ne estrae uno nuovo.
- L'**attrazione del mercato** dipende da lista d'attesa e brand prima del lancio, da retention e crescita organica dopo.

**Test di Sean Ellis**: la quota di utenti *molto delusi* = 5% + 0,58% × PMF, quindi **PMF 60 ≈ 40%**, la soglia di Ellis. Fasce: sotto 20 ricerca, 20-40 primi segnali, 40-60 promettente, 60-80 raggiunto, oltre 80 forte.

## 5. Mercato e clienti

**Curva di adozione** (Rogers). La penetrazione del settore è la somma dei clienti di *tutti* i team diviso il mercato (`engine/market.ts`):

| Segmento | Penetrazione fino a | CAC | Churn | Disponibilità a pagare |
|---|---|---|---|---|
| Innovatori | 2,5% | × 0,8 | × 1,3 | × 1,05 |
| Early adopter | 16% | × 1,0 | × 1,0 | × 1,0 |
| Maggioranza anticipatrice | 50% | × 1,3 | × 0,85 | × 0,95 |
| Maggioranza ritardataria | 84% | × 1,6 | × 0,8 | × 0,9 |
| Ritardatari | 100% | × 2,0 | × 0,75 | × 0,85 |

**Chasm** (Moore): nelle due maggioranze, con PMF sotto 55, il CAC è moltiplicato per 1,5.

**Disponibilità a pagare** = prezzo di riferimento × (0,6 + 0,8 × (metà qualità + metà PMF)) × (1 + 0,1 × brand) × eventi × segmento. La **conversione al prezzo** è (WTP / prezzo)^elasticità: sotto la WTP le vendite aumentano fino a +60%, sopra crollano rapidamente.

**CAC** = CAC base × segmento × chasm × adeguatezza del canale × concorrenza × (1,3 − 0,5 × PMF/100) × (1 − 0,25 × brand) × reputazione media × eventi ÷ (efficacia del marketing × conversione al prezzo × effetti di rete). La concorrenza aumenta del 6% per ogni altro team lanciato nel settore e del 2% per ogni concorrente esterno.

**Churn** = churn base × (1,6 − PMF/100) × segmento × canale × prezzo rispetto alla WTP × bug × qualità × customer success × reputazione, tra 0,3% e 45% al mese.

**Nuovi clienti ogni mese** = (marketing a pagamento + vendita diretta + passaparola organico + inbound da brand) × domanda:

- il marketing ha rendimenti decrescenti (saturazione) e oltre la capacità di esecuzione del team la spesa in eccesso rende solo il 30%;
- la vendita diretta dipende dalla forza vendita e dal PMF;
- il passaparola cresce con clienti, viralità del settore, PMF (sopra 60 accelera) e NPS, e si esaurisce con la penetrazione;
- prima del lancio il marketing costruisce una lista d'attesa che converte al 35% al momento del lancio.

**Mercato condiviso**: ogni azienda può conquistare al massimo il 4% del mercato residuo al mese; se il settore nel suo insieme chiede più del 10%, tutti vengono ridimensionati in proporzione.

**Unit economics**: LTV = prezzo × margine lordo × min(1/churn, 60 mesi); CAC mostrato = budget marketing ÷ clienti acquisiti a pagamento.

## 6. Team e assunzioni

- **Ruoli**: ingegnere, prodotto, design, growth, vendite, operations, customer success, finanza. Stipendi annui da 30-40k (junior) a 130-155k (principal).
- **Equity attesa**: da 0,1% (junior) a 2,5% (principal), × 1,3 prima del lancio e × 0,6 dopo un round sopra 20 M€.
- **Come scelgono i candidati** (`engine/hiring.ts`): punteggio = peso × stipendio offerto rispetto alla richiesta + peso × equity offerta rispetto all'attesa + 0,12 × compatibilità con il rischio della fase + 0,15 × reputazione verso i talenti + 0,18 × interesse per il settore − penalità (runway troppo breve, morale basso, fondatori stressati) + rumore. I candidati più propensi all'equity pesano di più le quote.
- **Asta**: tutte le offerte per lo stesso candidato, anche di team diversi, si confrontano; vince il punteggio migliore sopra la soglia. Chi arriva vicino alla soglia riceve un **rilancio** (più stipendio e più equity) valido per il round successivo.
- **Morale** e **stress dei fondatori** tendono ogni mese a un obiettivo che dipende da runway, crescita, ore lavorate, offsite, vacanza, equity diffusa. Stress sopra 0,85 per due mesi provoca **burnout**: fondatori a metà rendimento per 3 mesi. Le ore rendono 0,8 (40h), 1,0 (50h), 1,15 (60h), 1,3 (80h), ma con stress alto il rendimento cala.
- Con morale sotto 0,55 i dipendenti iniziano a dimettersi; chi ha equity non ancora maturata resta più volentieri.

## 7. Finanza

**Costi mensili** = stipendi + budget di R&S, marketing e operations + discovery + spese generali (1.000 € + 250 € a persona) + compliance + ufficio. **Runway** = cassa ÷ burn netto; con burn netto nullo o negativo l'azienda è *default alive* (Graham).

### Investitori

| Tipo | Taglio | Requisiti principali | Condizioni |
|---|---|---|---|
| Business angel (4) | 25k-400k | MVP almeno al 15-60% | Preferenza 1x |
| Acceleratore | 120k per il 7% | Entro il round 6, valutazione fino a 4 M€, almeno 50 ore settimanali | Un solo tentativo |
| Seed (2) | 0,3-2,5 M€ | Lancio e trazione (MRR 5k, PMF 50 o 500 clienti), oppure MVP al 60% per deeptech, AI e health | Option pool 5-8%, a volte un seggio |
| Corporate VC | 0,5-6 M€ | MRR almeno 20k | Può diventare acquirente |
| Series A (2) | 2-10 M€ | MRR 60-80k e PMF 55-57 | Seggio nel CdA, pool 10% |
| Growth | 10-40 M€ | MRR 300k, PMF 62, un round precedente | Seggio più un indipendente |
| Crowdfunding | 0,1-1,5 M€ | Lancio, B2C, fintech o health | Tutto o niente, nessuna preferenza |

**Decisione dell'investitore** (`engine/finance.ts`): valutazione pre-money equa = max(300k, valutazione − cassa netta) × propensione dell'investitore × √clima. L'interesse cresce con PMF, crescita, reputazione, forza del team, abilità di fundraising dei fondatori e clima; cala se si chiede una valutazione sopra quella equa, se l'importo è fuori dal taglio, se la runway è sotto 3 mesi. Il deal si chiude con interesse almeno 0,55 e richiesta entro il 115% della valutazione equa; con interesse tra 0,4 e 0,55 arriva un term sheet alternativo. Una diluizione oltre il 40% è sempre rifiutata. Massimo 2 pitch per round.

### Cap table

- **SAFE**: si convertono al primo round con prezzo al minore tra cap e pre-money.
- **Option pool shuffle**: il pool viene portato alla percentuale chiesta dall'investitore *prima* del round, quindi diluisce solo i soci esistenti.
- **Stock option ai dipendenti**: dal pool se capiente, altrimenti con nuove azioni che diluiscono tutti; vesting 48 mesi con cliff di 12.
- **Bandi**: voucher regionale 40k (probabilità base 50%) e bando europeo deep-tech 300k (30%, solo deeptech, health e AI); la probabilità cresce con la chiarezza del problema e il team. Denaro non diluitivo, una sola domanda per bando.
- **Prestiti**: pubblico a tasso zero (fino a 150k, 48 mesi), bancario al 7,5% (fino a 8 × MRR, garanzia personale che aumenta lo stress), venture debt al 12% con warrant dopo un round VC.
- **Round di salvataggio**: se la cassa è negativa a fine round, l'azienda riceve un salvataggio (deficit + 3 mesi di burn) a una valutazione pari al 30% di quella corrente, con **preferenza 2x** e un seggio nel CdA. Sono possibili 3 salvataggi in difficoltà *Indulgente*, 1 in *Standard*, nessuno in *Realistica*; dopo, fallimento. È l'unico effetto della difficoltà.
- **Waterfall** (`engine/captable.ts`): preferenze 1x non partecipanti pagate pari passu; ogni investitore converte in ordinarie se gli conviene; il pool non assegnato non riceve nulla. La **ricchezza dei fondatori** è quanto riceverebbero i fondatori attivi in un'uscita al valore attuale (o quanto hanno incassato davvero all'exit).
- **CdA**: ogni fondatore ha un seggio; alcuni investitori e i salvataggi aggiungono un seggio, il growth anche un indipendente.

## 8. Valutazione

```
metodo dei ricavi   = ARR × multiplo del settore × crescita × margine × PMF × clima
metodo scorecard    = valutazione pre-ricavi del settore × (team, avanzamento, PMF, reputazione, brand) × clima
valore del modello  = ricavi + scorecard × peso (il peso della scorecard si azzera con l'aumentare dell'ARR)
con un round nei 2 round precedenti: 0,6 × modello + 0,4 × ultima post-money
valutazione         = max(50k, valore + 0,5 × (cassa − debito))
```

La crescita conta tra 0,4 e 2,2 volte; un prodotto non lanciato dopo il round 7 perde valore del 15% a round. Il clima dipende dagli eventi e dall'entusiasmo per il settore (`engine/valuation.ts`).

## 9. Eventi, dilemmi e feedback

**Eventi di mercato** (16 modelli): recessione, boom tecnologico, inverno del funding, guerra dei talenti, hype AI, regolamentazione europea, limiti al tracciamento, aumento dei tassi, crisi della supply chain, crisi globale, ingresso di Big Tech, vento favorevole di settore, modello AI open-source, lavoro da remoto, ripresa dei consumi, fondi del Green Deal. Con probabilità 65% ogni round, più un secondo evento dal round 5. Il docente può aggiungerne di propri.

**Eventi aziendali** (14 modelli), con probabilità legate allo stato dell'azienda e al profilo di rischio.

**Dilemmi del fondatore** (dal round 2, con probabilità 45-75%; senza risposta vale l'ultima opzione):

| Dilemma | Scelte e conseguenze |
|---|---|
| Il grande cliente lo vuole a modo suo | Accettare: +12% clienti ma debito tecnico, meno chiarezza e sviluppo rallentato. Rifiutare: più chiarezza e morale |
| Big Tech vuole la tua persona migliore | Rilancio (+25% stipendio), equity, o lasciarla andare |
| Conflitto tra co-fondatori | Mediare, liquidare il co-fondatore (il vesting decide quante azioni tornano), ignorare (40% di rischio che se ne vada) |
| Growth hack con dark pattern | Churn più basso ma 55% di rischio di scandalo (−40k, reputazione). Rifiutare: morale e reputazione |
| Addestrare l'AI sui dati dei clienti | Scorciatoia: prodotto migliore, 35% di rischio di sanzione. Consenso: più lento ma reputazione |
| Pivot o perseverare? | Pivot: nuova idea (nuovo potenziale), meno clienti e brand. Perseverare: più stress, più apprendimento |
| Bridge round dagli investitori | SAFE immediato contro un po' di reputazione |
| Il CdA vuole un CEO professionista | Farsi da parte (si perde lo status di Re) o combattere (si vince se i fondatori controllano il CdA o con il 30% di fortuna) |
| Ufficio o remoto? | Ufficio: costi e morale. Remoto: coordinamento più basso, assunzioni più facili |
| Campagna con un influencer | 25k per una scommessa al 60% |
| Rendere open-source il core? | Brand, talenti e crescita organica contro disponibilità a pagare più bassa |
| Diventare sostenibili? | Brand e reputazione contro margine lordo più basso |
| Fondatori allo stremo | Riposare (sviluppo più lento) o spingere (rischio di crollo) |
| Tagliare il team? | Licenziare il 30%, ridurre gli stipendi, o tenere tutti |
| Offerta di acqui-hire | Exit a 250k per persona, distribuita con il waterfall |
| Sconto per il pagamento annuale | Cassa subito contro margine più basso |

**Mentor**: fino a 6 commenti per round basati su regole (runway sotto 3 e 6 mesi, LTV/CAC sotto 1 e 3, payback oltre 18 mesi, churn alto, prezzo lontano dalla WTP, chasm, PMF, debito tecnico, bug, morale, stress, quota dei fondatori sotto il 50%, perdita del controllo del CdA).

**Obiettivi** (19): tra gli altri primo al PMF, PMF raggiunto, sopravvissuto a una crisi di cassa, pivot riuscito, unicorno, bootstrapped, maestro del CAC, Re, Ricco, 1.000 clienti.

**Reputazione**: PR (20k), conferenza (10k), community (3k) aumentano la reputazione verso media, investitori, talenti o clienti, che col tempo torna verso valori di base.

## 10. Exit e fallimento

- **Offerte di acquisizione** dal round 4 al penultimo, per aziende con valutazione almeno 5 M€ o ARR almeno 1 M€. Acquirenti: un corporate VC già socio, un fondo di private equity (se l'azienda è in utile) o un acquirente strategico del settore, con premio tra 0,9 e 1,8 volte la valutazione. Accettare distribuisce il prezzo con il waterfall.
- **Fallimento**: solo se la cassa è negativa a fine round e non restano salvataggi.

## 11. Bot

| Stile | Runway obiettivo | Prezzo | Ore | Comportamento |
|---|---|---|---|---|
| Lean | 15 mesi | pieno | 50 | Discovery profonda, sviluppo di qualità, crescita prudente |
| Steady | 11 mesi | −8% | 60 | Lancio all'85% dell'MVP, raccolte regolari |
| Blitz | 7 mesi | −18% | 80 | Sviluppo veloce, lancio al 60%, raccolte grandi e frequenti, più assunzioni |

## 12. Punteggio e Ricco o Re

- **Ricchezza dei fondatori** (predefinito): quanto riceverebbero i fondatori dal waterfall.
- **Valutazione**: valore dell'azienda o prezzo di uscita.
- **Bilanciato**: 35% ricchezza, 25% valutazione, 15% sostenibilità (runway), 10% reputazione, 10% NPS, 5% morale.
- **Re**: fondatori con più del 50% dei voti e più seggi degli altri nel CdA, CEO non sostituito. **Ricco**: ricchezza dei fondatori di almeno 10 M€.

## 13. Complessità

| Livello | Dilemmi | Aste e rilanci | Debito tecnico | Simulatore del waterfall |
|---|---|---|---|---|
| Essenziale | no | no (assunzioni più facili) | no | no |
| Standard | sì | sì | sì | no |
| Avanzata | sì | sì | sì | sì, nella pagina Finanziamenti |

## 14. Bilanciamento

Lo script `npm run balance` gioca 60 partite con 6 aziende bot ciascuna (impostazioni predefinite) e riassume i risultati. Esecuzione di riferimento:

| Gruppo | Falliti | Exit | Salvati | PMF ≥ 60 raggiunto | Valutazione mediana | Ricchezza fondatori mediana | Quota fondatori |
|---|---|---|---|---|---|---|---|
| Tutte (360) | 5% | 18% | 10% | 39% | 13,0 M€ | 5,5 M€ | 45% |
| Bot lean | 2% | 23% | 6% | 81% | 12,0 M€ | 5,9 M€ | 54% |
| Bot steady | 5% | 26% | 7% | 36% | 18,1 M€ | 9,0 M€ | 53% |
| Bot blitz | 9% | 5% | 18% | 0% | 10,7 M€ | 3,5 M€ | 32% |

Letture utili in aula:
- La strategia **lean** raggiunge il PMF molto più spesso e fallisce meno: il gioco premia la disciplina della lean startup.
- La strategia **blitz** cresce e raccoglie di più ma non raggiunge mai il PMF, si diluisce di più e lascia meno ricchezza ai fondatori: è il costo dello *scalare prima del fit*.
- I settori B2B con multipli alti (DeepTech, AI, SaaS) generano più exit; consumer, e-commerce e fintech hanno più fallimenti e salvataggi per margini sottili o churn alto.
- I fallimenti si concentrano nei round 7-8, quando i round diventano semestrali e la cassa si consuma più in fretta per round: un buon momento per discutere di runway.

Il gioco è volutamente *indulgente* (pochi fallimenti), perché una squadra fallita impara meno dei round successivi. Per aule più esperte si può scegliere la difficoltà *Realistica*.

## 15. Dalla teoria alla meccanica

| Teoria | Autori | Dove si vede nel gioco |
|---|---|---|
| Startup come ricerca di un modello di business | Blank e Dorf | Settori con unit economics diverse; discovery; pivot |
| Build-measure-learn, MVP | Ries | Lancio anticipato, velocità di apprendimento, report dei round |
| Product-market fit e test del 40% | Andreessen; Ellis | Punteggio PMF e quota di utenti molto delusi |
| Diffusione dell'innovazione | Rogers | Segmenti di adozione con CAC, churn e WTP diversi |
| Chasm | Moore | Penalità sul CAC con PMF sotto 55 nella maggioranza |
| Default alive | Graham | Runway, mentor, burn netto |
| Scelte fondative e Rich vs King | Wasserman | Archetipi, quote e vesting, CdA, punteggio sulla ricchezza dei fondatori |
| Term sheet, option pool, preferenze | Feld e Mendelson | Investitori, shuffle del pool, waterfall, salvataggi 2x |
| Economia unitaria | | LTV, CAC, payback, elasticità del prezzo |
| Etica e reputazione | | Dilemmi con rischi differiti, reputazione su quattro pubblici |

## 16. Limiti e semplificazioni

Discuterli in aula è parte dell'apprendimento:

- niente imposte, IVA, capitale circolante e ammortamenti: la cassa è un flusso semplificato;
- preferenze solo 1x o 2x non partecipanti, niente clausole anti-diluizione, drag-along o vendite secondarie;
- concorrenti esterni rappresentati solo come pressione sul CAC, senza prezzi propri;
- dimensione del mercato fissa, salvo eventi;
- persone descritte da poche competenze numeriche; cultura e conflitti sintetizzati in morale, stress e dilemmi;
- gli investitori decidono con regole trasparenti e un po' di rumore, senza negoziazione libera.
