# VentureSim Professional - Integration Guide 🔧

## ✅ Cosa È Stato Fatto Automaticamente

Ho già integrato tutti i modelli nei file esistenti:

1. ✅ **`Player.swift`** esteso con:
   - `productCanvas`, `pmfMetrics`, `technicalDebt`
   - `developmentMetrics`, `founderMetrics`, `reputation`
   - `achievements`, `hiredCandidateIds`

2. ✅ **`GameState.swift`** esteso con:
   - `candidateCVs`, `candidatePreferences`
   - `activeAuctions`, `marketState`
   - `activeExogenousEvents`, `auctionOutcomes`

3. ✅ **`Sector.swift`** aggiornato con budget realistici ($25k-$50k)

4. ✅ **`GameState.swift`** aggiornato con periodicità variabile

5. ✅ **`ProductSystem.swift`** fixato typo in `velocityImpact`

6. ✅ **`CandidateLoader.swift`** creato per caricare JSON + generare CV/preferences

---

## 📋 TODO IN XCODE (Step by Step)

### STEP 1: Aprire Progetto Xcode

```bash
cd "/Users/christian/Desktop/CTRL STUDIO/Risorse Interne/Vibe-Coding/VentureSim"
open VentureSim.xcodeproj  # o .xcworkspace se esiste
```

Se non esiste progetto Xcode:
1. Apri Xcode
2. File → New → Project → macOS App
3. Product Name: `VentureSim`
4. Interface: SwiftUI, Language: Swift
5. Save nella cartella VentureSim

---

### STEP 2: Aggiungere Nuovi File al Progetto

**Trascina questi file nel progetto Xcode** (nella sezione `SimulationCore/`):

**Models:**
- `SimulationCore/Models/CandidateCV.swift` ✨
- `SimulationCore/Models/HiringOffer.swift` ✨
- `SimulationCore/Models/ProductSystem.swift` ✨
- `SimulationCore/Models/MarketDynamics.swift` ✨
- `SimulationCore/Models/Gamification.swift` ✨

**Engine:**
- `SimulationCore/Engine/CandidateAI.swift` ✨
- `SimulationCore/Engine/HiringAuctionSystem.swift` ✨
- `SimulationCore/Engine/TechnicalDebtCalculator.swift` ✨
- `SimulationCore/Engine/NetworkEffectsCalculator.swift` ✨

**Data:**
- `SimulationCore/Data/CandidateLoader.swift` ✨
- `SimulationCore/Data/candidates_professional.json` ✨

**Assicurati** che:
- ✅ "Copy items if needed" sia selezionato
- ✅ Target "VentureSim" sia selezionato
- ✅ "Create groups" (non "Create folder references")

---

### STEP 3: Aggiungere JSON al Bundle Resources

1. Seleziona `candidates_professional.json` nel Project Navigator
2. File Inspector (pannello destro) → **Target Membership**
3. Assicurati che "VentureSim" sia checked
4. Vai a **Project Settings** → **VentureSim target** → **Build Phases**
5. Espandi **Copy Bundle Resources**
6. Verifica che `candidates_professional.json` sia nella lista
7. Se non c'è, clicca + e aggiungilo

---

### STEP 4: Build & Fix Compilation Errors

Premi **⌘B** (Build).

**Errori attesi e come risolverli:**

#### Error 1: "Cannot find type 'Seniority' in scope"

**In `TeamMember.swift`, circa linea 90-95**, probabilmente c'è ancora un riferimento al vecchio `Seniority`:

**Soluzione**: Aggiungi import:
```swift
// All'inizio di TeamMember.swift, dopo import Foundation:
// Seniority is now defined in CandidateCV.swift
```

Se ci sono errori su `Candidate` struct che usa vecchio `Seniority`, la definizione è ora in `CandidateCV.swift`.

#### Error 2: "Ambiguous use of 'Candidate'"

Se `Candidate` è definito sia in `TeamMember.swift` che nei nuovi file:

**Soluzione**: Rimuovi la vecchia definizione di `Candidate` da `TeamMember.swift` se duplicata (dovrebbe essere solo in `CandidateCV.swift` o mantenere quella in `TeamMember.swift` se è quella base).

#### Error 3: Missing imports

Alcuni file potrebbero aver bisogno di import espliciti. Aggiungi all'inizio dei file che danno errore:

```swift
import Foundation
```

---

### STEP 5: Modificare GameViewModel (se esiste)

Se hai un `GameViewModel.swift`, dovrai aggiornarlo per:

1. **Caricare candidati professionali all'avvio**:

```swift
// In GameViewModel init o setup:
let (candidates, cvs, prefs) = CandidateLoader.loadProfessionalCandidates()
gameState.candidatePool = candidates
gameState.candidateCVs = cvs
gameState.candidatePreferences = prefs
```

2. **Gestire aste quando ci sono offerte multiple**:

```swift
// Dopo che i giocatori fanno decisioni hiring:
let auctions = HiringAuctionSystem.createAuctions(
    from: hiringDecisions, // [playerId: HiringDecision]
    candidatePool: gameState.candidatePool,
    period: gameState.currentRound
)

// Risolvi aste
let outcomes = HiringAuctionSystem.resolveAuctions(
    auctions: &gameState.activeAuctions,
    gameState: gameState,
    candidateCVs: gameState.candidateCVs,
    candidatePreferences: gameState.candidatePreferences,
    rng: rng
)
```

---

### STEP 6: Test Compilation

1. Premi **⌘B** (Build)
2. Se compila senza errori: ✅ **SUCCESSO!**
3. Se ci sono warning minori: OK, puoi ignorarli per ora
4. Se ci sono errori: leggi il messaggio e cerca la sezione "Error" qui sopra

---

### STEP 7: Test Runtime (Opzionale)

1. Premi **⌘R** (Run)
2. Crea una nuova partita
3. Verifica che non ci siano crash
4. Controlla Console per vedere: `"✅ Loaded X professional candidates"`

---

## 🐛 Troubleshooting Comune

### Problema: "No such module 'SimulationCore'"

**Soluzione**: Non serve un modulo separato. Tutti i file dovrebbero essere nello stesso target VentureSim.

### Problema: "Candidate initializer is ambiguous"

**Soluzione**: C'è probabilmente una doppia definizione di `Candidate`. Controlla:
- `TeamMember.swift` (linea ~90)
- `CandidateCV.swift` (non c'è, Candidate dovrebbe essere solo in TeamMember.swift)

Assicurati che `Candidate` sia definito **solo** in `TeamMember.swift`.

### Problema: "Seniority type mismatch"

**Soluzione**: Il nuovo `Seniority` enum è in `CandidateCV.swift` e ha 5 casi (junior, mid, senior, staff, principal). Il vecchio in `TeamMember.swift` ne aveva 3.

**Fix**: Rimuovi il vecchio enum `Seniority` da `TeamMember.swift` (l'ho già fatto, ma verifica).

### Problema: JSON non trovato

**Soluzione**: Verifica Build Phases → Copy Bundle Resources contiene `candidates_professional.json`.

### Problema: "Type 'PMFMetrics' has no member 'zero'"

**Soluzione**: `PMFMetrics` usa `init()`, non `.zero`. Controlla che l'init in `Player.swift` sia:
```swift
self.pmfMetrics = PMFMetrics()  // ✅ Corretto
// Non: self.pmfMetrics = PMFMetrics.zero
```

---

## ✨ STEP OPZIONALI (UI Implementation)

Dopo che compila, puoi aggiungere UI per i nuovi sistemi:

### UI da Creare (in ordine di priorità):

1. **`HiringView.swift`** - Mostra pool candidati con CV
2. **`CandidateCVDetailView.swift`** - CV completo con esperienze
3. **`AuctionResultsView.swift`** - Risultati aste
4. **`PMFDashboardView.swift`** - Score PMF + milestones
5. **`ProductCanvasView.swift`** - Gestione features
6. **`TechDebtView.swift`** - Technical debt tracking
7. **`ReputationView.swift`** - Press mentions + endorsements
8. **`AchievementsView.swift`** - Achievement unlocks
9. **`FounderStressView.swift`** - Stress meter + burnout risk

**Template per `HiringView.swift`:**

```swift
import SwiftUI

struct HiringView: View {
    @ObservedObject var viewModel: GameViewModel
    let player: Player

    var body: some View {
        List(viewModel.gameState.candidatePool) { candidate in
            CandidateRow(
                candidate: candidate,
                cv: viewModel.gameState.candidateCVs[candidate.id]
            )
        }
        .navigationTitle("Hiring - \(viewModel.gameState.candidatePool.count) Candidates")
    }
}

struct CandidateRow: View {
    let candidate: Candidate
    let cv: CandidateCV?

    var body: some View {
        VStack(alignment: .leading) {
            HStack {
                Text(candidate.name)
                    .font(.headline)
                Spacer()
                Text(candidate.seniority.rawValue)
                    .font(.caption)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color.blue.opacity(0.2))
                    .cornerRadius(4)
            }

            if let cv = cv {
                Text("\(cv.totalYearsExperience, specifier: "%.1f") years exp")
                    .font(.caption)
                    .foregroundColor(.secondary)

                if !cv.hiddenBonuses.isEmpty {
                    Text("⭐ Special talent")
                        .font(.caption)
                        .foregroundColor(.orange)
                }
            }

            Text("$\(Int(candidate.salaryAnnual/1000))k/year · \(candidate.role.rawValue)")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding(.vertical, 4)
    }
}
```

---

## 🎯 PROSSIMI STEP DOPO BUILD

Quando compila senza errori:

1. ✅ **Testare una partita completa** - Verifica che i nuovi campi non causino crash
2. ✅ **Aggiungere UI** - Inizia con HiringView per vedere i candidati
3. ✅ **Implementare logica aste in SimulationEngine** - Questo è il prossimo grande step
4. ✅ **Testare auctions** - Crea scenario con 2 player che offrono stesso candidato

---

## 📊 CHECKLIST FINALE

Quando tutto funziona, dovresti avere:

- [ ] ✅ Progetto compila senza errori
- [ ] ✅ App si avvia senza crash
- [ ] ✅ Candidati professionali caricati (vedi Console)
- [ ] ✅ Player ha nuovi campi (productCanvas, pmfMetrics, etc.)
- [ ] ✅ GameState ha nuovi campi (candidateCVs, activeAuctions, etc.)
- [ ] ✅ Budget iniziali sono $25k-$50k
- [ ] ✅ Periodicità è variabile (Q1-Q3, poi semestri)

---

## 🚀 COME PROCEDERE

**Opzione A - Minimal (Solo Backend)**:
1. Fai STEP 1-6
2. Testa che compili
3. Stop qui - i sistemi sono pronti ma senza UI

**Opzione B - Full Implementation**:
1. Fai STEP 1-6
2. Implementa UI views (STEP opzionali)
3. Integra logic in SimulationEngine
4. Testa gameplay completo

**Opzione C - Iterativo**:
1. Fai STEP 1-6 (backend)
2. Implementa **solo** HiringView (vedere candidati)
3. Testa hiring base
4. Poi aggiungi aste
5. Poi PMF dashboard
6. etc.

---

## 💡 SUGGERIMENTI

- **Commit dopo ogni step** che funziona
- **Usa Xcode Issues Navigator** (⌘5) per vedere tutti gli errori
- **Console logs** ti diranno se JSON è caricato correttamente
- **Breakpoint** in `CandidateLoader.loadProfessionalCandidates()` per debug

---

## 📞 SE RIMANI BLOCCATO

Errori comuni e dove cercare:

| Errore | Dove Guardare |
|--------|---------------|
| Cannot find type X | Missing import o file non nel target |
| Ambiguous use | Doppia definizione - cerca in tutti i file |
| JSON not found | Build Phases → Copy Bundle Resources |
| Crash at runtime | Console logs (⌘⇧Y) |
| Type mismatch | Probabilmente vecchio Seniority vs nuovo |

---

**Buona integrazione! Se hai dubbi, controlla i commenti `// ✨` nei file - segnano le aggiunte.** 🎉
