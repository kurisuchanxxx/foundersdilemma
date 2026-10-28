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

I round possono essere da 4 a 14. Sequenza di un round (`engine/round.ts`): decisioni una tantum (acquisizione, dilemma, licenziamenti, reputazione, bandi, term sheet, pitch, prestiti, prezzo), poi le aste per le assunzioni di tutti i team insieme, poi i mesi simulati (capacità del team, prodotto, mercato per settore con tutti i team, finanza, brand, team, eventi aziendali), infine controllo di solvibilità, valutazione, obiettivi e commenti del mentor.

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

Con più fondatori vale, per ogni dimensione, il **migliore** tra loro: è la ragione economica per cercare co-fondatori complementari (Wasserman). I team possono avere da 1 a 4 fondatori: il terzo e il quarto aggiungono solo il 35% della capacità di lavoro di un fondatore, così i team numerosi non sono avvantaggiati, e i fondatori occupano al massimo due seggi nel CdA qualunque sia il loro numero. La società nasce con 10 milioni di azioni divise secondo la scelta del team; il vesting dei fondatori (facoltativo) dura 48 mesi con cliff di 12: chi lascia prima perde le azioni non maturate.

## 4. Prodotto e product-market fit

**Capacità di sviluppo** = (ingegneria + 0,5 × prodotto + 0,3 × design) × coordinamento × leadership dei fondatori + contractor. Le persone rendono di più con morale alto; i junior rendono l'85% senza un mentor; i nuovi assunti impiegano due mesi a entrare a regime; il coordinamento cala oltre i 6 dipendenti (`engine/team.ts`).

**Sviluppo effettivo** = capacità × (1 − 0,6 × debito tecnico) × velocità dell'approccio × (1 − distrazione). L'avanzamento dell'MVP cresce ogni mese di sviluppo / sforzo MVP del settore.

| Approccio | Velocità | Debito tecnico | Bug | Qualità al lancio |
|---|---|---|---|---|
| Corsa | 1,35 | alto | molti | −0,05 |
| Bilanciato | 1,0 | medio | medi | 0 |
| Prima la qualità | 0,8 | basso | pochi | +0,08 |

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

**Curva di adozione** (Rogers). L'adozione del mercato è la somma di due parti (`engine/market.ts`):

- l'**adozione della categoria** da parte di concorrenti esterni e sostituti, che cresce con il tempo trascorso indipendentemente dai team: 1% + 44% × (avanzamento della partita)^1,17, cioè circa 1% all'inizio, il 16% del chasm poco prima di metà partita e circa 45% alla fine, qualunque sia la durata;
- i clienti di *tutti* i team del settore diviso il mercato.

Nella partita standard il mercato passa agli early adopter al round 2 e alla maggioranza anticipatrice intorno ai round 6-7. Il segmento decide i moltiplicatori:

| Segmento | Penetrazione fino a | CAC | Churn | Disponibilità a pagare |
|---|---|---|---|---|
| Innovatori | 2,5% | × 0,8 | × 1,3 | × 1,05 |
| Early adopter | 16% | × 1,0 | × 1,0 | × 1,0 |
| Maggioranza anticipatrice | 50% | × 1,3 | × 0,85 | × 0,95 |
| Maggioranza ritardataria | 84% | × 1,6 | × 0,8 | × 0,9 |
| Ritardatari | 100% | × 2,0 | × 0,75 | × 0,85 |

**Chasm** (Moore): nelle due maggioranze, con PMF sotto 55, il CAC è moltiplicato per 1,5 (per 1,2 con la nicchia come testa di ponte). Quando l'adozione supera l'11% e il PMF è sotto 55, il mentor avvisa il team che il chasm è vicino.

**Disponibilità a pagare** = prezzo di riferimento × (0,6 + 0,8 × (metà qualità + metà PMF)) × (1 + 0,1 × brand) × eventi × segmento di adozione × strategia (nicchia, premium, freemium, a consumo). È la stessa stima che il gioco mostra nelle decisioni e nella vista Mercato. La **conversione al prezzo** dipende dal rapporto r = prezzo / WTP: sotto la WTP vale 1 + ((1/r)^elasticità − 1) / 2, cioè le vendite aumentano al massimo del 60%; sopra la WTP vale r^−(elasticità + 1,5 × (r − 1)), cioè l'elasticità cresce con lo scarto. Anche nei settori poco sensibili al prezzo (B2B, DeepTech) esiste quindi un prezzo che massimizza i ricavi poco sopra la WTP: chi chiede il doppio perde gran parte dei clienti, chi chiede il massimo quasi tutti. La conversione al prezzo frena allo stesso modo marketing a pagamento, inbound, passaparola e lista d'attesa; nella vendita diretta i venditori possono scontare, ma non chiudere contratti molto sopra la WTP.

**CAC** = CAC base × segmento × chasm × adeguatezza del canale × concorrenza × (1,3 − 0,5 × PMF/100) × (1 − 0,25 × brand) × reputazione media × eventi ÷ (efficacia del marketing × conversione al prezzo × effetti di rete). La concorrenza aumenta del 6% per ogni altro team lanciato nel settore e del 2% per ogni concorrente esterno.

**Churn** = churn base × (1,6 − PMF/100) × segmento × canale × prezzo rispetto alla WTP × bug × qualità × customer success × reputazione, tra 0,3% e 45% al mese. Sopra la WTP il fattore di prezzo vale 1 + 0,6 × scarto + 1,2 × scarto² (scarto = prezzo / WTP − 1): chi paga molto più del valore percepito se ne va sempre più in fretta.

**Aumenti di prezzo**: quando il prezzo sale, i clienti attuali decidono di nuovo come farebbe un nuovo cliente, ma sono più fedeli perché hanno già adottato il prodotto: resta la radice quadrata del calo della conversione al prezzo. Salire fino alla WTP non costa quasi nessun cliente; decuplicare il prezzo li fa disdire quasi tutti.

**Nuovi clienti ogni mese** = (marketing a pagamento + vendita diretta + passaparola organico + inbound da brand) × domanda:

- il marketing ha rendimenti decrescenti (saturazione) e oltre la capacità di esecuzione del team la spesa in eccesso rende solo il 30%;
- la vendita diretta dipende dalla forza vendita e dal PMF;
- il passaparola cresce con clienti, viralità del settore, PMF (sopra 60 accelera) e NPS, e si esaurisce con la penetrazione;
- prima del lancio il marketing costruisce una lista d'attesa che converte al 35% al momento del lancio.

**Mercato condiviso**: ogni azienda può conquistare al massimo il 4% del mercato residuo al mese; se il settore nel suo insieme chiede più del 10%, tutti vengono ridimensionati in proporzione.

**Unit economics**: LTV = prezzo × margine lordo × min(1/churn, 60 mesi); CAC mostrato = budget marketing ÷ clienti acquisiti con il marketing a pagamento (gli stipendi dei venditori sono tra i costi del personale e i clienti chiusi dai venditori non entrano nel calcolo: nei settori trainati dalle vendite il CAC completo è più alto); payback del CAC = CAC ÷ (prezzo × margine lordo). Il margine lordo usato per LTV e payback è quello realizzato nel round (settore, strategia, eventi e un piccolo bonus delle operations), lo stesso mostrato nella vista Mercato.

### Clienti obiettivo e modello di prezzo

Ogni team sceglie **chi servire** (testa di ponte di Moore) e **come farsi pagare** (`engine/strategy.ts`). Gli effetti si sommano ai modificatori dell'azienda:

| Scelta | Mercato raggiungibile | Effetti |
|---|---|---|
| Nicchia (testa di ponte) | 30% del settore | Apprendimento del PMF × 1,3, CAC × 0,85, churn × 0,9, disponibilità a pagare × 1,05, penalità del chasm × 1,2 invece di × 1,5 |
| Mercato ampio | 100% | Nessuno (riferimento) |
| Premium / grandi clienti | 40% | Disponibilità a pagare × 1,7 × (0,75 + 0,5 × qualità), churn × 0,75, CAC × 1,5, dipendenza dai venditori +0,25, vendite outbound × 0,7 |
| Abbonamento | | Nessuno (riferimento) |
| Freemium | | CAC × 0,7, passaparola × 1,6, disponibilità a pagare × 0,85, churn × 1,1, margine lordo −7 punti |
| A consumo | | Elasticità al prezzo × 0,6, churn × 0,85, disponibilità a pagare × 0,9, CAC × 0,95, margine lordo −2 punti |

Il **mercato raggiungibile** limita saturazione, lista d'attesa e nuovi clienti: un'azienda di nicchia smette di crescere quando ha conquistato la sua nicchia, ed è il segnale per allargare l'obiettivo. Prima del lancio le scelte si cambiano gratis; dopo, cambiare clienti obiettivo costa il 12% dei clienti, 0,08 di market pull e l'8% di solution fit, cambiare modello di prezzo il 5% dei clienti e un po' di brand.

### Concorrenti esterni

Ogni settore parte con due **concorrenti con un nome** (aziende di fantasia, `data/rivals.ts`) con una forza tra 0,3 e 0,7 che varia nel tempo; altri possono entrare (probabilità 6% a round per settore, +1 concorrente esterno). Dal round 2, in ogni settore con almeno un team, al massimo un concorrente fa una mossa per round, con probabilità 0,06 + 0,16 × forza (+0,08 se un team ha più del 40% dei clienti del settore). Le mosse diventano notizie del settore e modificatori:

| Mossa | Effetto sul settore |
|---|---|
| Guerra dei prezzi | Disponibilità a pagare × 0,9 per 2 round |
| Campagna pubblicitaria massiccia | CAC × 1,15 per 1 round |
| Nuova versione del prodotto | Churn × 1,08 per 2 round |
| Grande round di finanziamento | Richieste salariali × 1,05, il concorrente diventa più forte |
| Assunzioni aggressive | Richieste salariali × 1,12 e candidati più difficili per 1 round |
| Chiusura | Domanda × 1,06 per 2 round, un concorrente in meno |

## 6. Team e assunzioni

- **Ruoli**: ingegnere, prodotto, design, growth, vendite, operations, customer success, finanza. Stipendi annui da 30-40k (junior) a 130-155k (principal).
- **Equity attesa**: da 0,1% (junior) a 2,5% (principal), × 1,3 prima del lancio, × 1 dopo il lancio con PMF sotto 60, × 0,8 con PMF raggiunto e × 0,6 dopo un round con valutazione sopra 20 M€.
- **Come scelgono i candidati** (`engine/hiring.ts`): punteggio = peso × stipendio offerto rispetto alla richiesta + peso × equity offerta rispetto all'attesa + 0,12 × compatibilità con il rischio della fase + 0,15 × reputazione verso i talenti + 0,18 × interesse per il settore − penalità (runway troppo breve, morale basso, fondatori stressati) + rumore. I candidati più propensi all'equity pesano di più le quote.
- **Asta**: tutte le offerte per lo stesso candidato, anche di team diversi, si confrontano; vince il punteggio migliore sopra la soglia. Chi arriva vicino alla soglia riceve un **rilancio** (più stipendio e più equity) valido per il round successivo.
- **Morale** e **stress dei fondatori** tendono ogni mese a un obiettivo che dipende da runway, crescita, ore lavorate, offsite, vacanza, equity diffusa. Stress sopra 0,85 per due mesi provoca **burnout**: fondatori a metà rendimento per 3 mesi. Le ore rendono 0,8 (40h), 1,0 (50h), 1,15 (60h), 1,3 (80h), ma con stress sopra 0,6 il rendimento cala. Ogni mese consecutivo a 60 ore o più accumula **fatica**: lo stress obiettivo sale di 0,01 al mese a 60h e di 0,035 al mese a 80h (fino a 12 mesi); a 50 ore o meno la fatica scende di 2 mesi al mese, una vacanza la azzera. Le 80 ore rendono nel breve ma, mantenute per un anno, portano quasi sempre al burnout: nelle simulazioni non battono le 60 ore.
- Con morale sotto 0,55 i dipendenti iniziano a dimettersi; chi ha equity non ancora maturata resta più volentieri.

## 7. Finanza

**Costi mensili** = stipendi + budget di R&S, marketing e operations + discovery + spese generali (1.000 € + 250 € a persona) + compliance + ufficio. **Runway** = cassa ÷ burn netto (il burn include le rate dei prestiti e gli incassi mancanti dei clienti che hanno prepagato). Con burn netto nullo o negativo l'azienda è già in pareggio: è il caso più semplice di *default alive* (Graham), che in generale chiede se, alla crescita attuale, si arriva al pareggio prima di finire la cassa.

### Investitori

| Tipo | Taglio | Requisiti principali | Condizioni | Nuovi investimenti per round · capitale per partita |
|---|---|---|---|---|
| Business angel (4) | 25k-400k | MVP almeno al 15-60% | Preferenza 1x | 2 · 1-1,5 M€ (club: 3 · 3 M€) |
| Acceleratore | 120k per il 7% | Entro il round 6, valutazione fino a 4 M€, almeno 50 ore settimanali | Un solo tentativo | 3 · 1,8 M€ |
| Seed (2) | 0,3-2,5 M€ | Lancio e trazione (MRR 5k, PMF 50 o 500 clienti), oppure MVP al 60% per deeptech, AI e health | Option pool 5-8%, a volte un seggio | 2-3 · 14-16 M€ |
| Corporate VC | 0,5-6 M€ | MRR almeno 20k | Può diventare acquirente | 2 · 24 M€ |
| Series A (2) | 2-10 M€ | MRR 60-80k e PMF 55-57 | Seggio nel CdA, pool 10% | 2 · 40 M€ |
| Growth | 10-40 M€ | MRR 300k, PMF 62, un round precedente | Seggio più un indipendente | 1 · 120 M€ |
| Crowdfunding | 0,1-1,5 M€ | Lancio, B2C, fintech o health | Tutto o niente, nessuna preferenza | Nessun limite |

**Decisione dell'investitore** (`engine/finance.ts`): valutazione pre-money equa = max(300k, valore del modello ancorato all'ultimo round, senza la cassa) × propensione dell'investitore × √clima × (1 + 0,003 × (reputazione verso gli investitori − 50)). L'interesse cresce con PMF, crescita, reputazione, forza del team, abilità di fundraising dei fondatori e clima; cala se si chiede una valutazione sopra quella equa, se l'importo è fuori dal taglio, se la runway è sotto 3 mesi. Il deal si chiude con interesse almeno 0,55 e richiesta entro il 115% della valutazione equa; con interesse tra 0,4 e 0,55 arriva un term sheet alternativo. Una diluizione oltre il 40% è sempre rifiutata, anche nel crowdfunding, e un nuovo SAFE che porterebbe i SAFE in essere oltre il 60% dell'azienda viene rifiutato (prima serve un round con prezzo). Massimo 2 pitch per round.

**Capacità degli investitori** (*dry powder*): ogni investitore chiude al massimo un certo numero di nuovi investimenti per round e ha un capitale totale per la partita (tabella sopra). Tutti i pitch del round, di tutti i team e dei bot, vengono valutati insieme: l'investitore ordina quelli che vorrebbe chiudere per punteggio di interesse e firma i migliori finché ha posti e capitale. Gli altri ricevono un rifiuto che nomina chi ha ottenuto i soldi (o, se manca il capitale, quanto ne resta).

### Cap table

- **SAFE**: si convertono al primo round con prezzo al minore tra cap e pre-money. Prima della conversione la quota dei fondatori mostrata nel gioco li conta già come convertiti ai loro cap (quota *fully diluted*), così l'accumulo di SAFE non è una sorpresa.
- **Option pool shuffle**: il pool viene portato alla percentuale chiesta dall'investitore *prima* del round, quindi diluisce solo i soci esistenti.
- **Stock option ai dipendenti**: dal pool se capiente, altrimenti con nuove azioni che diluiscono tutti; vesting 48 mesi con cliff di 12.
- **Bandi**: voucher regionale 40k (probabilità base 50%) e bando europeo deep-tech 300k (30%, solo deeptech, health e AI); la probabilità cresce con la chiarezza del problema e il team. Denaro non diluitivo, una sola domanda per bando.
- **Prestiti** (valutati sui numeri visti al momento della decisione; se si chiede più del limite, il finanziatore presta il massimo): pubblico a tasso zero (fino a 150k, 48 mesi, uno per azienda), bancario al 7,5% per 24 mesi (servono almeno 8k di MRR; fino a 8 × MRR e al massimo 250k, compreso quanto si deve già alla banca; garanzia personale che aumenta lo stress), venture debt al 12% per 36 mesi con warrant dello 0,5% (fino al 35% di un round VC chiuso negli ultimi 3 round, meno il venture debt ancora da restituire). Il tasso è fisso alla firma: un rialzo dei tassi rende più cari i nuovi prestiti, non quelli in corso.
- **Round di salvataggio**: se la cassa è negativa a fine round, l'azienda riceve un salvataggio (deficit + 3 mesi di burn) a una valutazione pari al 30% di quella corrente, con **preferenza 2x** e un seggio nel CdA. Sono possibili 3 salvataggi in difficoltà *Indulgente*, 1 in *Standard*, nessuno in *Realistica*; dopo, fallimento. È l'unico effetto della difficoltà.
- **Waterfall** (`engine/captable.ts`): preferenze 1x (2x nei salvataggi) non partecipanti pagate pari passu; un investitore converte in ordinarie quando il prezzo per azione ordinaria supera la sua preferenza per azione. Convertono per primi quelli con la preferenza per azione più bassa; ogni conversione abbassa il prezzo, e chi a quel punto non ci guadagna resta sulla preferenza: nessun investitore riceve meno della sua preferenza. Il pool non assegnato non riceve nulla; le opzioni non hanno prezzo di esercizio e le azioni non maturate sono pagate per intero (semplificazione). I SAFE non convertiti partecipano come preferenze convertibili ai loro cap. La **ricchezza dei fondatori** è quanto riceverebbero i fondatori attivi in un'uscita al valore attuale (o quanto hanno incassato davvero all'exit).
- **CdA**: i fondatori hanno un seggio ciascuno, al massimo due; alcuni investitori e i salvataggi aggiungono un seggio, il growth anche un indipendente. I fondatori controllano il CdA finché hanno più seggi di investitori e indipendenti insieme.

## 8. Valutazione

```
metodo dei ricavi   = ARR × multiplo del settore × crescita × margine × PMF × clima
metodo scorecard    = valutazione pre-ricavi del settore × (team, avanzamento, PMF, reputazione, brand) × clima
valore del modello  = max(scorecard, ricavi + scorecard × peso)   (il peso della scorecard si azzera con l'aumentare dell'ARR)
ancora all'ultimo round con prezzo: peso 0,4 per due round, poi 0,27, 0,13 e 0
valore ancorato     = (1 − peso) × modello + peso × ultima post-money
valutazione         = max(50k, valore ancorato + 0,5 × (cassa − debito − ricavi prepagati ancora da erogare))
```

Il massimo con la scorecard evita che i primi ricavi abbassino la valutazione; l'ancora che sfuma evita salti quando il round precedente esce dal calcolo.

La crescita conta tra 0,4 e 2,2 volte; un prodotto non lanciato dopo il round 7 perde valore del 15% a round. Il clima dipende dagli eventi e dall'entusiasmo per il settore (`engine/valuation.ts`).

## 9. Eventi, dilemmi e feedback

**Eventi di mercato** (16 modelli): recessione, boom tecnologico, inverno del funding, guerra dei talenti, hype AI, regolamentazione europea, limiti al tracciamento, aumento dei tassi, crisi della supply chain, crisi globale, ingresso di Big Tech, vento favorevole di settore, modello AI open-source, lavoro da remoto, ripresa dei consumi, fondi del Green Deal. Con probabilità 65% ogni round; dal round 5, nel 25% dei casi, arriva anche un secondo evento. Il docente può aggiungerne di propri.

**Eventi aziendali** (14 modelli), con probabilità legate allo stato dell'azienda e al profilo di rischio.

**Dilemmi del fondatore** (dal round 2, con probabilità 45-75%; senza risposta vale l'opzione passiva, cioè l'ultima, tranne per il CEO professionista, dove il CdA procede e il fondatore si fa da parte):

| Dilemma | Scelte e conseguenze |
|---|---|
| Il grande cliente lo vuole a modo suo | Accettare: +12% clienti ma debito tecnico, meno chiarezza e sviluppo rallentato. Rifiutare: più chiarezza e morale |
| Big Tech vuole la tua persona migliore | Rilancio (+25% stipendio), equity, o lasciarla andare |
| Conflitto tra co-fondatori | Mediare, liquidare il co-fondatore (il vesting decide quante azioni tornano), ignorare (40% di rischio che se ne vada) |
| Growth hack con dark pattern | Churn più basso ma 55% di rischio di scandalo (−40k, reputazione). Rifiutare: morale e reputazione |
| Addestrare l'AI sui dati dei clienti | Scorciatoia: prodotto migliore, 35% di rischio di sanzione. Consenso: più lento ma reputazione |
| Pivot o perseverare? | Pivot: nuova idea (nuovo potenziale), meno clienti e brand. Perseverare: più stress, più apprendimento |
| Bridge round dagli investitori | SAFE immediato contro un po' di reputazione |
| Il CdA vuole un CEO professionista | Compare solo quando i fondatori hanno perso il controllo del CdA. Farsi da parte (si perde lo status di Re) o combattere (si vince con il 30% di probabilità, al prezzo di morale, stress e reputazione verso gli investitori) |
| Ufficio o remoto? | Ufficio: costi e morale. Remoto: coordinamento più basso, assunzioni più facili |
| Campagna con un influencer | 25k per una scommessa al 60% |
| Rendere open-source il core? | Brand, talenti e crescita organica contro disponibilità a pagare più bassa |
| Diventare sostenibili? | Brand e reputazione contro margine lordo più basso |
| Fondatori allo stremo | Riposare (sviluppo più lento) o spingere (rischio di crollo) |
| Tagliare il team? | Licenziare il 30%, ridurre gli stipendi, o tenere tutti |
| Offerta di acqui-hire | Exit a 250k per persona, distribuita con il waterfall |
| Sconto per il pagamento annuale | Un quarto dei clienti paga 12 mesi in anticipo con il 20% di sconto: cassa subito, poi per 12 mesi nessun incasso da loro (ricavo differito), churn più basso per due round. Nel complesso si rinuncia al 20% di quei ricavi in cambio di liquidità |

**Mentor**: fino a 6 commenti per round basati su regole (runway sotto 3 e 6 mesi, LTV/CAC sotto 1 e 3, payback oltre 18 mesi, churn alto, prezzo lontano dalla WTP, chasm, PMF, debito tecnico, bug, morale, stress, quota dei fondatori sotto il 50%, perdita del controllo del CdA).

**Obiettivi** (19): tra gli altri primo al PMF, PMF raggiunto, sopravvissuto a una crisi di cassa, pivot riuscito, unicorno, bootstrapped, maestro del CAC, Re, Ricco, 1.000 clienti.

**Reputazione**: PR (20k), conferenza (10k), community (3k) aumentano la reputazione verso media, investitori, talenti o clienti, che col tempo torna verso valori di base.

## 10. Exit e fallimento

- **Offerte di acquisizione** dal round 4 all'ultimo, per aziende con valutazione almeno 5 M€ o ARR almeno 1 M€. Acquirenti: un corporate VC già socio (1,1-1,6 volte la valutazione), un fondo di private equity se l'azienda è in utile (0,9-1,3) o un acquirente strategico del settore (0,95-1,8, fino a circa 2 nei settori più ambiti). Accettare distribuisce il prezzo con il waterfall.
- **Offerte da altri team**: vedi la sezione seguente.
- **Fallimento**: solo se la cassa è negativa a fine round e non restano salvataggi.

## 11. Interazione tra team

Nella scheda **Accordi** delle decisioni (`engine/deals.ts`):

- **Partnership**: un team propone, l'altro accetta nel round successivo. Dura 3 round e dà a entrambe le aziende CAC × 0,92 e churn × 0,95 se sono dello stesso settore (alleanza), CAC × 0,88 e passaparola × 1,15 se sono di settori diversi (co-marketing), più 0,02 di brand. Al massimo 2 partnership attive per azienda.
- **Acquisizione**: un team offre una cifra in contanti (almeno metà della valutazione dell'altra azienda e non oltre la propria cassa); l'altro team decide nel round successivo in Finanza ed exit. Se accetta, il prezzo è distribuito ai suoi soci con il waterfall e la sua partita finisce. Chi compra paga subito, rileva la cassa, i debiti e i contratti prepagati dell'azienda acquisita, riceve tutte le persone (senza equity, con un periodo di inserimento e morale −0,03), la qualità di prodotto migliore e una parte del brand; se l'azienda acquisita è dello stesso settore anche l'85% dei clienti, metà della lista d'attesa e la chiarezza del problema. Se al momento del sì il compratore non ha più la cassa, l'offerta decade.

## 12. Bot

| Stile | Runway obiettivo | Prezzo | Ore | Comportamento |
|---|---|---|---|---|
| Lean | 15 mesi | pieno | 50 | Discovery profonda, sviluppo di qualità, crescita prudente; se a metà partita l'MVP non è finito, lanciano comunque (dal 50%) |
| Steady | 11 mesi | −8% | 60 | Lancio all'85% dell'MVP, raccolte regolari |
| Blitz | 7 mesi | −18% | 80 | Sviluppo veloce, lancio al 60%, raccolte grandi e frequenti, più assunzioni |

Strategia dei bot: i lean partono da una **nicchia** e passano al mercato ampio dopo il PMF; gli steady vanno sul **premium** nei settori che dipendono dai venditori e usano il prezzo **a consumo** nell'infrastruttura AI; i blitz puntano al mercato ampio e al **freemium** nei settori virali. I bot accettano il 70% delle partnership proposte, gli steady ne propongono a volte una, e steady e blitz con molta cassa possono fare un'offerta per un'azienda in difficoltà o con meno PMF.

## 13. Punteggio e Ricco o Re

- **Ricchezza dei fondatori** (predefinito): quanto riceverebbero i fondatori dal waterfall.
- **Valutazione**: valore dell'azienda o prezzo di uscita.
- **Bilanciato**: 35% ricchezza, 25% valutazione, 15% sostenibilità (runway), 10% reputazione, 10% NPS, 5% morale.
- **Re**: azienda ancora attiva, fondatori con più del 50% dei voti e più seggi degli altri nel CdA, CEO non sostituito (chi vende l'azienda non è più Re). **Ricco**: ricchezza dei fondatori di almeno 10 M€.

## 14. Complessità

| Livello | Dilemmi | Aste e rilanci | Debito tecnico | Simulatore del waterfall |
|---|---|---|---|---|
| Essenziale | no | aste sì, rilanci no (assunzioni più facili) | no | no |
| Standard | sì | sì | sì | no |
| Avanzata | sì | sì | sì | sì, nella pagina Finanziamenti |

## 15. Bilanciamento

Lo script `npm run balance` gioca 60 partite con 6 aziende bot ciascuna (impostazioni predefinite) e riassume i risultati. Esecuzione di riferimento:

| Gruppo | Falliti | Exit | Salvati | PMF ≥ 60 raggiunto | Valutazione mediana | Ricchezza fondatori mediana | Quota fondatori |
|---|---|---|---|---|---|---|---|
| Tutte (360) | 5% | 19% | 12% | 53% | 13,0 M€ | 5,7 M€ | 43% |
| Bot lean | 5% | 19% | 11% | 95% | 10,9 M€ | 5,9 M€ | 52% |
| Bot steady | 3% | 35% | 7% | 65% | 19,6 M€ | 9,0 M€ | 51% |
| Bot blitz | 8% | 4% | 19% | 0% | 10,2 M€ | 2,5 M€ | 30% |

Letture utili in aula:
- La strategia **lean** raggiunge il PMF molto più spesso e fallisce meno: il gioco premia la disciplina della lean startup.
- La strategia **blitz** raccoglie di più e cresce in fretta all'inizio, ma non raggiunge mai il PMF: quando il mercato arriva alla maggioranza anticipatrice finisce nel chasm, si diluisce di più e lascia ai fondatori meno della metà della ricchezza degli steady. È il costo dello *scalare prima del fit*.
- I settori B2B con multipli alti (DeepTech, AI, SaaS) generano più exit; consumer, e-commerce e fintech hanno più fallimenti e salvataggi per margini sottili o churn alto.
- Con investitori dai posti limitati soffre soprattutto chi brucia molto (blitz: 8% di fallimenti e 19% di salvataggi): quando tutti chiedono soldi insieme, chi ha i numeri peggiori resta fuori.
- La nicchia iniziale dei bot lean porta il PMF al 95%: la testa di ponte accelera l'apprendimento.
- I fallimenti si concentrano nei round 7-10, nella seconda metà della partita: i round semestrali (dal round 5) consumano più cassa per round e il mercato è passato alla maggioranza, più costosa da conquistare. Un buon momento per discutere di runway.
- Nelle simulazioni con un team umano, il prezzo migliore resta vicino alla disponibilità a pagare in tutti i settori: chiedere il doppio o il massimo consentito fa perdere quasi sempre.

Il gioco è volutamente *indulgente* (pochi fallimenti), perché una squadra fallita impara meno dei round successivi. Per aule più esperte si può scegliere la difficoltà *Realistica*.

## 16. Dalla teoria alla meccanica

| Teoria | Autori | Dove si vede nel gioco |
|---|---|---|
| Startup come ricerca di un modello di business | Blank e Dorf | Settori con unit economics diverse; discovery; pivot |
| Build-measure-learn, MVP | Ries | Lancio anticipato, velocità di apprendimento, report dei round |
| Product-market fit e test del 40% | Andreessen; Ellis | Punteggio PMF e quota di utenti molto delusi |
| Diffusione dell'innovazione | Rogers | Segmenti di adozione con CAC, churn e WTP diversi |
| Chasm e testa di ponte | Moore | Penalità sul CAC con PMF sotto 55 nella maggioranza; scelta della nicchia, del mercato ampio o dei clienti premium |
| Modelli di prezzo | Ramanujam e Tacke; Anderson | Abbonamento, freemium e a consumo con effetti su CAC, passaparola, churn e margine |
| Strategia competitiva | Porter | Concorrenti esterni con mosse (guerre dei prezzi, campagne, chiusure) |
| Coopetizione | Brandenburger e Nalebuff | Partnership tra team dello stesso settore o di settori diversi |
| Mercato dei capitali | | Investitori con posti e capitale limitati; acquisizioni tra startup |
| Default alive | Graham | Runway, mentor, burn netto |
| Scelte fondative e Rich vs King | Wasserman | Archetipi, quote e vesting, CdA, punteggio sulla ricchezza dei fondatori |
| Term sheet, option pool, preferenze | Feld e Mendelson | Investitori, shuffle del pool, waterfall, salvataggi 2x |
| Economia unitaria | | LTV, CAC, payback, elasticità del prezzo |
| Etica e reputazione | | Dilemmi con rischi differiti, reputazione su quattro pubblici |

## 17. Limiti e semplificazioni

Discuterli in aula è parte dell'apprendimento:

- niente imposte, IVA, capitale circolante e ammortamenti: la cassa è un flusso semplificato;
- preferenze solo 1x o 2x non partecipanti, niente clausole anti-diluizione, drag-along o vendite secondarie;
- concorrenti esterni con mosse a livello di settore, senza clienti e prezzi propri;
- le partnership hanno effetti fissi e le acquisizioni si pagano solo in contanti (niente carta, earn-out o integrazioni fallite);
- dimensione del mercato fissa, salvo eventi; l'adozione della categoria segue la stessa curva nel tempo in tutti i settori e non riduce i clienti disponibili per i team;
- la valutazione conta metà della cassa netta e i prestiti non vengono rimborsati all'exit;
- persone descritte da poche competenze numeriche; cultura e conflitti sintetizzati in morale, stress e dilemmi;
- gli investitori decidono con regole trasparenti e un po' di rumore, senza negoziazione libera.
