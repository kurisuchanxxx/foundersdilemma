# Guida per il docente

## 1. Prima del corso (circa 3 ore, una tantum)

1. **Installa il gioco** (vedi il [README](../../README.md#installazione)) oppure apri `FoundersDilemma-web.html` in un browser.
2. **Gioca una partita di prova** in *Solo contro bot*, complessità *Standard*: bastano 40-60 minuti, inviando a ogni round le decisioni con pochi ritocchi, per vedere tutte le schermate e il debriefing finale. Il pulsante *Simula fino alla fine* compare quando la vostra azienda esce dal gioco (exit o fallimento).
3. **Leggi** il [piano delle sessioni](02-piano-sessioni.md) e il capitolo sul [modello di simulazione](06-modello-di-simulazione.md) almeno nelle parti su PMF, mercato e finanza.
4. **Prepara la distribuzione**: carica su Moodle (o sulla piattaforma dell'ateneo) gli installer e il file web, con il [manuale dello studente](04-manuale-studente.md).
5. **Scegli il seed** della classe e annotalo: con lo stesso seed, gli stessi team e le stesse decisioni la partita si ripete identica; con decisioni diverse restano uguali il mercato di partenza e gli eventi macroeconomici, utile per confrontare le edizioni.

## 2. Creare la partita della classe

*Nuova partita* sulla schermata iniziale, poi:

| Impostazione | Consiglio |
|---|---|
| Modalità | **Classe (file)** se ogni team ha un portatile; **Hot-seat** se c'è un solo computer |
| Team umani e bot | 4-8 team; aggiungete 1-2 bot se i team sono meno di 5, così il mercato è vivo |
| Nome della sessione | es. *Startup Venturing 2026 - Classe A* (compare nei file e nei report) |
| Seed | Lasciate quello proposto o sceglietene uno memorabile |
| Round e durata | 10 round, *4 trimestri, poi semestri* (circa 4 anni) |
| Complessità | **Standard**; **Essenziale** per una prima sessione breve o per la triennale; **Avanzata** per i corsi di finanza (aggiunge il simulatore del waterfall di uscita) |
| Difficoltà | **Standard** (un round di salvataggio punitivo, poi fallimento). *Indulgente* concede fino a 3 salvataggi; *Realistica* nessuno |
| Come si decide il vincitore | **Ricchezza dei fondatori** (consigliato: rende visibile il costo della diluizione), oppure valutazione, oppure criterio bilanciato |
| Tempo per round | 30' o 45' |
| PIN del docente | Consigliato in Hot-seat: blocca la console e il pulsante *Avanza il round* |

Poi configurate i team: nome, settore, fondatori, quote e vesting. In aula conviene farlo fare ai team stessi (in Hot-seat a turno, in modalità Classe sul vostro computer mentre il team detta le scelte, oppure raccogliendole prima con un modulo).

## 3. Condurre un round

### Modalità Classe (un portatile per team, senza rete)

Il vostro computer conserva la copia *ufficiale* della partita. Il ciclo di ogni round:

1. **Console docente > Esporta file di partita per i team.** Ottenete un file `NomeSessione_roundN.fdgame.json`: caricatelo su Moodle o in una cartella condivisa.
2. **I team** aprono il gioco, scelgono *Partecipa a una classe*, aprono il file, selezionano il proprio team, decidono e premono **Blocca ed esporta il file delle decisioni**. Vi consegnano un file `Team_roundN.fddecision.json` (pochi kB).
3. **Console docente > Importa i file delle decisioni**: selezionateli tutti insieme. Il riquadro conferma ogni team importato e segnala i file sbagliati (altra partita, round già passato).
4. **Avanza il round.** Se manca qualche team, il gioco chiede conferma: chi non ha consegnato va col *pilota automatico* (le impostazioni del round precedente) e perde terreno, perché non decidere è il contrario dell'innovazione (vedi sotto).
5. **Esporta di nuovo il file di partita** e condividetelo. I team lo importano da *Impostazioni e salvataggio > Importa la partita aggiornata dal docente* e vedono subito il report del round.

Il ciclo funziona anche a distanza, con scadenze tra un incontro e l'altro.

### Modalità Hot-seat (un computer, eventualmente il proiettore)

- Selezionate il team dal riquadro in alto a sinistra: appare la schermata *Passa il computer a ...*, i dati restano nascosti finché il team non preme *Siamo ...: mostra la nostra azienda*.
- Quando il team ha inviato le decisioni, passate al successivo. Con tutti i team pronti, *Avanza il round* nella barra in alto.
- Con il PIN, la console docente e il pulsante *Avanza il round* chiedono il PIN: gli studenti non possono avanzare da soli.

### Strumenti della console docente

| Strumento | Uso in aula |
|---|---|
| **Timer del round** (15', 10', 20', 30') | Il conto alla rovescia compare nella barra in alto per tutti |
| **Team pronti** | Chi ha già inviato le decisioni |
| **Evento a sorpresa** | Scegliete uno degli otto shock predefiniti (blocco degli investitori, boom della domanda, recessione, nuovo concorrente, shock dei costi, carenza di talenti, nuova regolamentazione, stimolo governativo), modificate titolo e descrizione, intensità (da ×0,5 a ×2) e durata, e decidete chi colpire: tutti, un settore o un team. Effettivo da subito e visibile nelle news |
| **Vista proiettore** | Classifica e notizie a tutto schermo, senza dati riservati |
| **Tabella dei team** | Cassa, runway, MRR, PMF e valutazione di tutti i team: utile per il debriefing, da non proiettare durante il round |
| **Spunti per la discussione** | Le domande guida del [piano delle sessioni](02-piano-sessioni.md) per la fase della partita, più quelle legate agli eventi del round |

### Esportazioni per la valutazione

*Impostazioni e salvataggio > Esportazione dati per i docenti*: tre file CSV (storico di tutti i team e round, decisioni, classifica) che si aprono con Excel, Numbers o Google Sheets. Con *Risultati finali > Stampa / PDF* ottenete il debriefing finale da allegare ai materiali del corso.

**Report del team.** In *Risultati finali* ogni team ha il pulsante *Report del team*, e durante la partita lo stesso report si scarica da *Report dei round*. È una pagina HTML autonoma, stampabile in PDF, con numeri, grafici, decisioni round per round, finanziamenti, dilemmi, segnalazioni del mentor e le domande del post-mortem: la base del report finale dei team.

**Tour guidato.** Alla prima partita in solitario, e alla prima apertura di una copia del team in modalità Classe, parte un tour di due minuti sulle schermate principali. Si salta con un clic e si rivede dalla pagina *Impara*.

## 4. Condurre il debriefing

Il debriefing è il momento in cui si impara davvero. Una struttura in tre passi che funziona:

1. **Cosa è successo?** Proiettate classifica e notizie. Chiedete a due team con risultati opposti di descrivere le proprie decisioni.
2. **Perché?** Collegate i risultati a un concetto: *il vostro CAC è salito perché il mercato ha superato gli early adopter e il vostro PMF era sotto 55: questo è il chasm* (succede di solito verso metà partita, e il mentor lo annuncia un round prima). Aprite la scheda corrispondente in *Impara*.
3. **E nella realtà?** Un caso reale o una domanda: *quale startup conoscete che ha scalato prima del PMF?*

Le meccaniche di interazione danno ottimi spunti di debriefing:

- **Investitori contesi**: quando due team fanno pitch allo stesso investitore e uno resta fuori, il report lo dice esplicitamente. È il momento per parlare di *dry powder* e di come gli investitori confrontano le opportunità.
- **Partnership e acquisizioni tra team** (scheda *Accordi*): fate raccontare la trattativa. Chi ha proposto, chi ha accettato e perché? In un'acquisizione, il prezzo era giusto rispetto al waterfall dei venditori e alla cassa del compratore?
- **Concorrenti esterni**: le loro mosse compaiono nelle notizie a inizio round. Chiedete ai team del settore colpito come hanno reagito (prezzo, valore, nicchia).

Evitate di premiare solo il primo in classifica: valorizzate le decisioni ben argomentate anche quando l'esito è stato sfortunato (la simulazione contiene incertezza di proposito).

## 5. Problemi frequenti

| Problema | Soluzione |
|---|---|
| macOS: *impossibile aprire l'app perché lo sviluppatore non può essere verificato* | Clic destro sull'app > Apri > Apri. Su macOS 15+: Impostazioni di Sistema > Privacy e sicurezza > Apri comunque |
| Windows: avviso di SmartScreen | *Ulteriori informazioni* > *Esegui comunque* |
| Computer dell'ateneo senza permessi di installazione | Usate `FoundersDilemma-web.html` in Chrome, Edge, Firefox o Safari |
| Un team ha inviato il file sbagliato | La console lo segnala (*appartiene a un'altra partita* o *è per il round N*); il team riesporta dal proprio gioco |
| Un team non ha consegnato | Avanzate comunque: va col pilota automatico e perde terreno (sviluppo e vendite al 75% della capacità, morale, fiducia degli investitori e chiarezza del problema in calo; il costo cresce a ogni round saltato di fila). Se l'assenza è giustificata, fate inviare anche solo le decisioni invariate, oppure in Hot-seat inviatele voi per il team: basta un invio, anche senza modifiche, per evitare la penalità |
| Un team ha sbagliato una decisione per errore | Prima di avanzare potete reimportare un nuovo file del team: sostituisce il precedente |
| Volete tornare indietro di un round | Ripartite dal file di partita del round precedente (conservate sempre i file esportati) o da una copia salvata in *Impostazioni e salvataggio* |
| Un team è fallito presto | Resta in partita come osservatore: chiedetegli un post-mortem anticipato e di fare da *board advisor* per un altro team |
| Il computer del docente si guasta | Ogni file di partita esportato è un backup completo: apritelo da un altro computer con *Apri file di partita* |

## 6. Dati e privacy

Il gioco non usa account e non invia nulla in rete. I salvataggi sono nel database locale dell'app (o del browser) di ciascun computer. I file di partita contengono i nomi dei team e, se inseriti, i nomi degli studenti e le foto caricate come avatar dei fondatori: in modalità Classe arrivano a tutti i team, quindi chiedete il consenso prima di usare foto vere, oppure fate usare gli avatar disegnati. Per la ricerca didattica sui CSV esportati seguite le regole dell'ateneo (consenso informato, anonimizzazione).

## 7. Integrità delle partite valutate

Il gioco è pensato per imparare, non per un esame a prova di frode. Il file di partita che condividete in modalità Classe è una copia completa della partita: chi lo apre con *Apri file di partita* invece che con *Partecipa a una classe* può provare decisioni diverse e vedere i risultati in anticipo, e *Partecipa a una classe* non verifica chi sceglie quale team. Il PIN protegge la console dall'uso casuale, non da uno studente determinato. Per questo:

- valutate soprattutto i decision memo, il report finale e il ragionamento (vedi [Valutazione e rubriche](05-valutazione-e-rubriche.md)), non solo la posizione in classifica;
- se la classifica pesa sul voto, giocate i round in aula entro il tempo del timer, oppure in Hot-seat sul vostro computer;
- conservate i file di decisione ricevuti: dicono chi ha consegnato cosa e quando.
