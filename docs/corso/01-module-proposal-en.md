# Teaching module proposal

## Founder's Dilemma: simulating the birth and financing of a startup

*An experiential module for a Startup Venturing course*

---

### 1. Summary

Student teams found and run a startup for four simulated years. Every round they set budgets, price and sales channel, develop the product, hire, raise money and answer dilemmas drawn from research on founders. A deterministic simulation engine returns the consequences: customers, revenue, cash, product-market fit, dilution and valuation.

The game makes **testable** what lectures leave abstract: the search for product-market fit, unit economics, the chasm between early adopters and the mainstream market, the real cost of equity and the trade-off between wealth and control (Wasserman's *Rich vs King*). Each round ends with a guided debrief that connects outcomes to theory.

| Item | Proposal |
|---|---|
| Placement | Module of the Startup Venturing course (master's level or final year of a bachelor's in Economics, Management or Industrial Engineering) |
| Credits | 3 ECTS (about 75 hours: 18 in class, 57 of team work and individual study) |
| Language | English or Italian (the game is bilingual) |
| Duration | 6 sessions of 3 hours over 3 to 6 weeks |
| Participants | 12 to 60 students in 4 to 8 teams of 3 to 5 |
| Prerequisites | Basic accounting and marketing; no technical skills |
| Cost | No licence fees: free software that runs offline on students' laptops or on a single computer with a projector |

### 2. Rationale

1. **Learning by doing.** Experiential learning (Kolb, 1984) alternates concrete experience, reflection, conceptualisation and experimentation. The round cycle (decide, observe, discuss, revise the strategy) follows the same sequence.
2. **Evidence from entrepreneurship education.** Research on simulations and serious games in entrepreneurship education (Fox, Pittaway and Uzuegbunam, 2018) reports gains in motivation, understanding of interdependencies and entrepreneurial self-efficacy, provided the game comes with a structured debrief. The module is built around that debrief.
3. **Mistakes at zero cost.** Failing, over-diluting or losing board control in a simulation costs part of a grade, not a life's savings. Assessment rewards learning from mistakes: decision memos and the post-mortem weigh more than the ranking.
4. **A bridge between theory and tools.** Every mechanic maps to a course model and links to the in-game glossary (61 concepts with formulas and references).
5. **Sustainable for the university.** No licences, no servers, no personal data collected. The code is open and auditable; the engine is documented and reproducible (same seed, same events), which also supports comparisons across classes and teaching research.

### 3. Learning outcomes (Dublin descriptors)

**Knowledge and understanding.** Students:
- describe the stages of a startup, from the search for a business model to growth (Blank; Ries);
- explain product-market fit, the adoption curve and the chasm (Rogers; Moore);
- know the main funding sources (bootstrapping, grants, debt, crowdfunding, business angels, venture capital) and instruments (SAFE, priced rounds, option pool, liquidation preference).

**Applying knowledge and understanding.** Students:
- compute and interpret runway, burn rate, CAC, LTV, churn and CAC payback to set budgets and prices;
- build and read a cap table, anticipating the effect of dilution, the option pool shuffle and liquidation preferences on founders' wealth;
- plan hiring and compensation, balancing salary and equity.

**Making judgements.** Students:
- weigh trade-offs without a single right answer (growth vs survival, control vs capital, speed vs product quality);
- face ethical dilemmas (dark patterns, data use, promises to investors) and argue their choices;
- recognise their own decision biases by reviewing past decisions.

**Communication skills.** Students:
- write short, reasoned decision memos;
- present their strategy and a data-driven post-mortem to the class;
- negotiate within the team and with simulated investors.

**Learning skills.** Students:
- use metrics to formulate and test hypotheses (build-measure-learn);
- transfer what they learned to real cases and to their own venture project.

### 4. Content

| Session | Theme | Concepts | Game rounds |
|---|---|---|---|
| 1 | The founding team and the idea | Startups as a search for a business model; founder archetypes; equity split; vesting and cliff | Solo practice game, founding the companies, round 1 |
| 2 | From problem to MVP | Customer discovery; MVP; build-measure-learn; product-market fit and the Sean Ellis test; technical debt | Rounds 2-3 |
| 3 | Go-to-market and unit economics | Price and willingness to pay; channels; CAC, LTV, churn; adoption curve and chasm | Rounds 4-5 |
| 4 | People and organisation | First hires; equity compensation; option pool; founder morale and burnout | Rounds 6-7 |
| 5 | Financing growth | Grants and debt; angels and VCs; SAFEs and priced rounds; dilution; term sheets; liquidation preference; board control | Rounds 8-9 |
| 6 | Exit and debrief | Acquisition offers; waterfall; Rich vs King; post-mortem | Round 10, final results, presentations |

The detailed session plan (in Italian) is in [02-piano-sessioni.md](02-piano-sessioni.md).

### 5. Teaching methods

- **Mini-lectures** of 30-45 minutes at the start of each session on the concept needed next.
- **Game rounds** of 30-40 minutes with a projected timer. Teams use their own laptops (Classroom mode) or take turns on one computer (Hot-seat mode).
- **Debriefs** of 30 minutes after every two rounds: standings, market news and guiding questions suggested by the instructor console.
- **Work between sessions**: a one-page decision memo per round; rounds can also be played remotely through the file exchange cycle.
- **Surprise events**: the instructor can inject market shocks (regulation, recession, a new competitor) to discuss resilience and pivots.

### 6. Assessment

| Component | Weight | Type |
|---|---|---|
| Decision memos (one per round, team) | 30% | Formative and summative |
| Final report and post-mortem (team) | 30% | Summative |
| Final presentation (pitch and lessons learned) | 20% | Summative |
| In-game result | 10% | Summative, in bands |
| Peer evaluation and participation | 10% | Individual |

The in-game result deliberately weighs little: reasoning matters more than luck or score optimisation. Rubrics and templates (in Italian) are in [05-valutazione-e-rubriche.md](05-valutazione-e-rubriche.md).

### 7. Technical and organisational requirements

- **Software**: a free desktop app for macOS 11+ and Windows 10/11, or a single HTML file that opens in any recent browser and can be uploaded to the learning platform.
- **Room**: a projector for the instructor console and power for laptops. Alternatively, a single computer (Hot-seat mode).
- **Network**: not required. In Classroom mode files travel through the learning platform, e-mail, a shared folder or a USB key.
- **Personal data**: the game neither collects nor transmits data; saves stay on the computers. Student names, if entered, appear only in reports exported by the instructor.
- **Instructor preparation**: about 3 hours the first time (reading the guide and one solo practice game).

### 8. Core references

- Blank, S. (2013). Why the lean start-up changes everything. *Harvard Business Review*, 91(5), 63-72.
- Blank, S., and Dorf, B. (2012). *The Startup Owner's Manual*. K&S Ranch.
- Ellis, S., and Brown, M. (2017). *Hacking Growth*. Crown Business.
- Feld, B., and Mendelson, J. (2019). *Venture Deals* (4th ed.). Wiley.
- Fox, J., Pittaway, L., and Uzuegbunam, I. (2018). Simulations in entrepreneurship education: Serious games and learning through play. *Entrepreneurship Education and Pedagogy*, 1(1), 61-89.
- Kolb, D. A. (1984). *Experiential Learning*. Prentice-Hall.
- Moore, G. A. (2014). *Crossing the Chasm* (3rd ed.). HarperBusiness.
- Ries, E. (2011). *The Lean Startup*. Crown Business.
- Rogers, E. M. (2003). *Diffusion of Innovations* (5th ed.). Free Press.
- Wasserman, N. (2008). The founder's dilemma. *Harvard Business Review*, 86(2), 102-109.
- Wasserman, N. (2012). *The Founder's Dilemmas*. Princeton University Press.

### 9. Possible developments

- Later editions with the same seed to compare classes and measure the effect of teaching changes.
- Integration with the course's venture project: teams apply the game's metrics to their real idea.
- Teaching research on exported decisions and results, following the university's data rules.
