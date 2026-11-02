# Slide

Le presentazioni di Founder's Dilemma e il pacchetto di lezioni per i docenti, in PDF (1920 x 1080, una slide per pagina) e in sorgente.

## Presentazione del gioco

Dodici slide per presentare il gioco a un docente, a una scuola o a un partner.

- [Presentazione in italiano](presentazione-it.pdf)
- [Presentation in English](presentazione-en.pdf)

## Pacchetto docente: sei incontri da 3 ore

Una lezione per incontro, da 25 a 45 minuti, più le slide per condurre l'aula: scaletta, le decisioni del giorno in gioco, le domande di debriefing e la consegna. Le note per il docente, slide per slide, sono nel file `-note.md` accanto a ogni PDF.

| Incontro | Slide | Note |
|---|---|---|
| 1 · Il team fondatore e l'idea | [PDF](incontro-1-team-fondatore-e-idea.pdf) | [note](incontro-1-team-fondatore-e-idea-note.md) |
| 2 · Dal problema all'MVP | [PDF](incontro-2-dal-problema-all-mvp.pdf) | [note](incontro-2-dal-problema-all-mvp-note.md) |
| 3 · Go-to-market ed economia unitaria | [PDF](incontro-3-go-to-market.pdf) | [note](incontro-3-go-to-market-note.md) |
| 4 · Persone e organizzazione | [PDF](incontro-4-persone-e-organizzazione.pdf) | [note](incontro-4-persone-e-organizzazione-note.md) |
| 5 · Finanziare la crescita | [PDF](incontro-5-finanziare-la-crescita.pdf) | [note](incontro-5-finanziare-la-crescita-note.md) |
| 6 · Exit e debriefing finale | [PDF](incontro-6-exit-e-debriefing.pdf) | [note](incontro-6-exit-e-debriefing-note.md) |

Le lezioni insegnano i concetti reali di imprenditorialità e startup, con casi e ricerche (Blank, Ries, Graham, Wasserman, CB Insights e altri); il gioco compare come esempio, nella riga "Nel gioco." in fondo alle slide.

Il pacchetto segue il [piano delle sessioni](../corso/02-piano-sessioni.md) e la [guida per il docente](../corso/03-guida-docente.md).

## Sorgenti

In [`sorgenti/`](sorgenti) ogni deck ha un `deck.json` (ordine, sezioni, font) e una cartella `slides/` con una sezione HTML per slide, con le note del docente nel tag `<aside>`. È il formato delle slide su claude.ai, dove stanno gli originali modificabili. Le immagini sono indicate come `/_blob/...` e si vedono solo lì: i PDF le hanno già incorporate.

Font: Geist Serif per titoli e numeri, Geist per il testo (Vercel, SIL Open Font License 1.1).
