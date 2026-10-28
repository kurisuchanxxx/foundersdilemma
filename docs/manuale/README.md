# Manuale: architettura, stack ed evoluzione

Sezione 2.1 del manuale operativo di Founder's Dilemma, impaginata come una pagina "Systems Data" dell'Apollo Operations Handbook (1969).

- [`manuale-architettura-stack-evoluzione.pdf`](manuale-architettura-stack-evoluzione.pdf): le tre pagine in un unico PDF da stampare (A4, bianco e nero).
- `pagina-2.1-N.html` / `.pdf` / `.png`: sorgente, stampa e anteprima di ogni pagina.

| Pagina | Contenuto |
|---|---|
| 2.1-1 | Schema a blocchi dello stack (motore, interfaccia, piattaforma, Vite, tre distribuzioni) e flussi GitHub Actions |
| 2.1-2 | Cronologia dello sviluppo dal blueprint Swift alla versione 2.1.0, righe per giornata, confronto blueprint e versione attuale |
| 2.1-3 | Ciclo del round del motore, modalità Classe senza server, derivazione dei flussi casuali |

I numeri vengono dal codice (`package.json`, `vite.config.ts`, `src-tauri/`, `.github/workflows/`, `src/core/engine/round.ts`, `src/core/rng.ts`, `src/core/engine/setup.ts`, `src/ui/classroom.ts`) e dalla storia git al 22 ottobre 2026. Caratteri in `fonts/` con le rispettive licenze.
