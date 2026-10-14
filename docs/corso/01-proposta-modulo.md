# Proposta di modulo didattico

## Founder's Dilemma: simulare la nascita e il finanziamento di una startup

*Modulo esperienziale per un corso di Startup Venturing*

---

### 1. Sintesi

Il modulo porta in aula un business game in cui gruppi di studenti fondano e guidano una startup per quattro anni simulati. In ogni round i team decidono budget, prezzo, canale di vendita, sviluppo del prodotto, assunzioni e finanziamenti, e rispondono a dilemmi tratti dalla ricerca sui fondatori. Un motore di simulazione deterministico restituisce le conseguenze: clienti, ricavi, cassa, product-market fit, diluizione, valutazione.

Il gioco rende **sperimentabili** concetti che nelle lezioni frontali restano astratti: la ricerca del product-market fit, l'economia unitaria, il chasm tra early adopter e mercato di massa, il costo reale dell'equity, il trade-off tra ricchezza e controllo (*Rich vs King*, Wasserman). Ogni round si chiude con un debriefing guidato che collega i risultati alla teoria.

| Voce | Proposta |
|---|---|
| Collocazione | Modulo all'interno del corso di Startup Venturing (laurea magistrale o ultimo anno della triennale in Economia, Management, Ingegneria gestionale) |
| Crediti | 3 ECTS (circa 75 ore di impegno: 18 d'aula, 57 di lavoro di gruppo e studio individuale) |
| Ambito disciplinare | Economia e gestione delle imprese (in Italia SECS-P/08) |
| Lingua | Italiano o inglese (il gioco è bilingue) |
| Durata | 6 incontri da 3 ore, nell'arco di 3-6 settimane |
| Partecipanti | Da 12 a 60 studenti, in 4-8 team da 3-5 persone |
| Prerequisiti | Nozioni base di contabilità e di marketing; nessuna competenza tecnica |
| Costi | Nessuna licenza: software gratuito, funziona offline sui portatili degli studenti o su un solo computer con proiettore |

### 2. Motivazione

1. **Imparare facendo.** L'apprendimento esperienziale (Kolb, 1984) alterna esperienza concreta, riflessione, concettualizzazione e sperimentazione. Il ciclo del round (decidere, osservare i risultati, discutere, rivedere la strategia) segue esattamente questa sequenza.
2. **Evidenza nella didattica dell'imprenditorialità.** La letteratura sulle simulazioni e i serious game in entrepreneurship education (Fox, Pittaway e Uzuegbunam, 2018) mostra benefici su motivazione, comprensione delle interdipendenze e autoefficacia imprenditoriale, purché il gioco sia accompagnato da un debriefing strutturato. Il modulo è costruito attorno a questo debriefing.
3. **Errori a costo zero.** Fallire, diluirsi troppo o perdere il controllo del CdA in una simulazione costa un voto parziale, non i risparmi di una vita. Il gioco premia l'apprendimento dall'errore (decision memo e post-mortem valgono più del piazzamento).
4. **Ponte tra teoria e strumenti.** Ogni meccanica corrisponde a un modello del corso e rimanda alla scheda di glossario integrata nell'app (56 concetti, con formule e riferimenti).
5. **Sostenibile per l'ateneo.** Nessun costo di licenza, nessun server da gestire, nessun dato personale raccolto. Il codice è aperto e verificabile; il motore è documentato e riproducibile (stesso seed, stessi eventi), quindi adatto anche a confronti tra classi e a progetti di ricerca didattica.

### 3. Obiettivi formativi e risultati di apprendimento attesi

Formulati secondo i descrittori di Dublino.

**Conoscenza e capacità di comprensione.** Al termine del modulo lo studente:
- descrive le fasi di sviluppo di una startup, dalla ricerca del modello di business alla crescita (Blank; Ries);
- spiega product-market fit, curva di adozione e chasm (Rogers; Moore);
- conosce le principali fonti di finanziamento (bootstrapping, bandi, debito, crowdfunding, business angel, venture capital) e gli strumenti relativi (SAFE, round prezzati, option pool, liquidation preference).

**Capacità di applicare conoscenza e comprensione.** Lo studente:
- calcola e interpreta runway, burn rate, CAC, LTV, churn e payback del CAC per decidere budget e prezzo;
- costruisce e legge una cap table, anticipando l'effetto di diluizione, option pool shuffle e preferenze di liquidazione sulla ricchezza dei fondatori;
- pianifica assunzioni e compensi bilanciando stipendio ed equity.

**Autonomia di giudizio.** Lo studente:
- valuta trade-off senza risposta unica (crescita contro sopravvivenza, controllo contro capitale, velocità contro qualità del prodotto);
- affronta dilemmi etici (dark pattern, uso dei dati, promesse agli investitori) argomentando le proprie scelte;
- riconosce i propri bias decisionali analizzando le decisioni prese a posteriori.

**Abilità comunicative.** Lo studente:
- redige decision memo sintetici e motivati;
- presenta la strategia del team e un post-mortem basato sui dati davanti alla classe;
- negozia all'interno del team e con gli investitori simulati.

**Capacità di apprendimento.** Lo studente:
- usa le metriche per formulare e verificare ipotesi (logica build-measure-learn);
- trasferisce quanto appreso nel gioco ai casi reali discussi nel corso e al proprio progetto imprenditoriale.

### 4. Contenuti

| Incontro | Tema | Concetti | Round di gioco |
|---|---|---|---|
| 1 | Il team fondatore e l'idea | Startup come ricerca di un modello di business; archetipi dei fondatori; divisione delle quote; vesting e cliff | Partita di prova in solitario, fondazione delle aziende, round 1 |
| 2 | Dal problema all'MVP | Customer discovery; MVP; build-measure-learn; product-market fit e test di Sean Ellis; debito tecnico | Round 2-3 |
| 3 | Go-to-market ed economia unitaria | Prezzo e disponibilità a pagare; canali; CAC, LTV, churn; curva di adozione e chasm | Round 4-5 |
| 4 | Persone e organizzazione | Prime assunzioni; equity come compenso; option pool; morale e burnout dei fondatori | Round 6-7 |
| 5 | Finanziare la crescita | Bandi e debito; angel e VC; SAFE e round prezzati; diluizione; term sheet; liquidation preference; controllo del CdA | Round 8-9 |
| 6 | Exit e debriefing | Offerte di acquisizione; waterfall; Rich vs King; post-mortem | Round 10, risultati finali, presentazioni |

Il dettaglio di ogni incontro è nel [piano delle sessioni](02-piano-sessioni.md).

### 5. Metodi didattici

- **Mini-lezioni** di 30-45 minuti all'inizio di ogni incontro, sul tema del round successivo.
- **Round di gioco** di 30-40 minuti per team, con timer proiettato. I team usano i propri portatili (modalità Classe) oppure si alternano su un computer (modalità Hot-seat).
- **Debriefing** di 30 minuti dopo ogni coppia di round: classifica, eventi di mercato e domande guida proposte dalla console del docente.
- **Lavoro tra gli incontri**: decision memo di una pagina per round; il docente può anche far giocare un round a distanza (ciclo dei file).
- **Eventi a sorpresa**: il docente può iniettare shock di mercato (regolazione, recessione, nuovo concorrente) per discutere resilienza e pivot.

### 6. Valutazione

| Componente | Peso | Tipo |
|---|---|---|
| Decision memo (uno per round, di team) | 30% | Formativa e sommativa |
| Report finale e post-mortem (di team) | 30% | Sommativa |
| Presentazione finale (pitch e lezioni apprese) | 20% | Sommativa |
| Risultato nel gioco | 10% | Sommativa, a fasce |
| Valutazione tra pari e partecipazione | 10% | Individuale |

Il risultato nel gioco pesa poco di proposito: conta la qualità del ragionamento, non la fortuna o l'ottimizzazione del punteggio. Rubriche e modelli sono in [Valutazione e rubriche](05-valutazione-e-rubriche.md).

### 7. Requisiti tecnici e organizzativi

- **Software**: app desktop gratuita per macOS 11+ e Windows 10/11 (installazione in un minuto, anche senza diritti di amministratore su Windows) oppure un unico file HTML apribile in qualsiasi browser recente, caricabile su Moodle.
- **Aula**: un proiettore per la console del docente; prese elettriche per i portatili. In alternativa, un solo computer (modalità Hot-seat).
- **Rete**: non necessaria. Nella modalità Classe i file si scambiano tramite piattaforma e-learning, e-mail, cartella condivisa o chiavetta.
- **Dati personali**: il gioco non raccoglie né trasmette dati; i salvataggi restano sui computer. I nomi degli studenti, se inseriti, compaiono solo nei report esportati dal docente.
- **Preparazione del docente**: circa 3 ore la prima volta (lettura della guida e una partita di prova in solitario).

### 8. Bibliografia essenziale

- Blank, S. (2013). Why the lean start-up changes everything. *Harvard Business Review*, 91(5), 63-72.
- Blank, S., e Dorf, B. (2012). *The Startup Owner's Manual*. K&S Ranch.
- Ellis, S., e Brown, M. (2017). *Hacking Growth*. Crown Business.
- Feld, B., e Mendelson, J. (2019). *Venture Deals* (4a ed.). Wiley.
- Fox, J., Pittaway, L., e Uzuegbunam, I. (2018). Simulations in entrepreneurship education: Serious games and learning through play. *Entrepreneurship Education and Pedagogy*, 1(1), 61-89.
- Kolb, D. A. (1984). *Experiential Learning*. Prentice-Hall.
- Moore, G. A. (2014). *Crossing the Chasm* (3a ed.). HarperBusiness.
- Ries, E. (2011). *The Lean Startup*. Crown Business.
- Rogers, E. M. (2003). *Diffusion of Innovations* (5a ed.). Free Press.
- Wasserman, N. (2008). The founder's dilemma. *Harvard Business Review*, 86(2), 102-109.
- Wasserman, N. (2012). *The Founder's Dilemmas*. Princeton University Press.

Letture complementari: Graham, P. (2015), *Default Alive or Default Dead?* (saggio online); Sarasvathy, S. D. (2001), Causation and effectuation, *Academy of Management Review*, 26(2), 243-263; Osterwalder, A., e Pigneur, Y. (2010), *Business Model Generation*, Wiley.

### 9. Sviluppi possibili

- Edizioni successive con lo stesso seed per confrontare le classi (e misurare l'effetto di cambiamenti didattici).
- Versione in sola lingua inglese per i programmi internazionali (già disponibile nel gioco).
- Integrazione con il progetto imprenditoriale del corso: i team applicano le metriche del gioco alla propria idea reale.
- Ricerca didattica: le esportazioni CSV di decisioni e risultati permettono studi sulle strategie degli studenti, nel rispetto delle regole di ateneo sui dati.
