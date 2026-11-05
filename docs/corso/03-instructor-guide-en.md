# Instructor guide

## 1. Before the course (about 3 hours, once)

1. **Install the game** (see the [README](../../README.md#english)) or open `FoundersDilemma-web.html` in a browser. The game also runs online, with no installation, at [kurisuchanxxx.github.io/foundersdilemma/play](https://kurisuchanxxx.github.io/foundersdilemma/play/).
2. **Play a practice game** in *Solo vs bots*, *Standard* complexity: 40-60 minutes are enough, submitting each round's decisions with a few tweaks, to see every screen and the final debrief. The *Simulate to the end* button appears when your company leaves the game (exit or bankruptcy).
3. **Read** the [session plan](02-session-plan-en.md) and the chapter on the [simulation model](06-modello-di-simulazione.md) (in Italian), at least the parts on PMF, market and finance.
4. **Prepare the distribution**: upload the installers and the web file to Moodle (or your university's platform), together with the [student manual](04-student-manual-en.md).
5. **Choose the class seed** and write it down: with the same seed, the same teams and the same decisions the game repeats identically; with different decisions the starting market and the macroeconomic events stay the same, which is useful for comparing editions of the course.

## 2. Creating the class game

*New game* on the home screen, then:

| Setting | Advice |
|---|---|
| Game mode | **Classroom (files)** if each team has a laptop; **Hot-seat** if there is only one computer |
| Human teams and bots | 4-8 teams; add 1-2 bots if there are fewer than 5 teams, so the market stays lively |
| Session name | e.g. *Startup Venturing 2026 - Class A* (it appears in the files and reports) |
| Seed | Keep the suggested one or choose a memorable one |
| Rounds and round length | 10 rounds, *4 quarters, then semesters* (about 4 years) |
| Complexity | **Standard**; **Essential** for a short first session or for bachelor's students; **Advanced** for finance courses (adds the exit waterfall simulator) |
| Difficulty | **Standard** (one punitive rescue round, then bankruptcy). *Forgiving* allows up to 3 rescues; *Realistic* none |
| How the winner is decided | **Founder wealth** (recommended: it makes the cost of dilution visible), or company valuation, or the balanced criterion |
| Suggested time per round | 30' or 45' |
| Instructor PIN | Recommended in Hot-seat: it locks the console and the *Advance round* button |

Then set up the teams: name, sector, founders, equity split and vesting. In class it is best to let the teams do it themselves (taking turns in Hot-seat; in Classroom mode on your computer while each team dictates its choices, or by collecting them beforehand with a form).

## 3. Running a round

### Classroom mode (one laptop per team, no network)

Your computer keeps the *official* copy of the game. The cycle of each round:

1. **Instructor console > Export game file for teams.** You get a file `SessionName_roundN.fdgame.json`: upload it to Moodle or to a shared folder.
2. **The teams** open the game, choose *Join a class (team)*, open the file, select their team, decide and press **Lock and export the decision file**. They hand you a file `Team_roundN.fddecision.json` (a few kB).
3. **Instructor console > Import decision files**: select them all at once. The panel confirms each imported team and flags wrong files (another game, a past round).
4. **Advance round.** If some teams are missing, the game asks for confirmation: teams that did not submit run on *autopilot* (the previous round's settings) and lose ground, because not deciding is the opposite of innovation (see below).
5. **Export the game file again** and share it. The teams import it from *Settings & save > Import updated game from instructor* and see the round report straight away.

The cycle also works remotely, with deadlines between sessions.

### Hot-seat mode (one computer, possibly on the projector)

- Select the team in the box at the top left: the *Pass the computer to ...* screen appears, and the data stay hidden until the team presses *We are ...: show our company*.
- When the team has submitted its decisions, move on to the next one. When all teams are ready, press *Advance round* in the top bar.
- With a PIN set, the instructor console and the *Advance round* button ask for it: students cannot advance on their own.

### Instructor console tools

| Tool | Use in class |
|---|---|
| **Round timer** (15', 10', 20', 30') | The countdown appears in the top bar for everyone |
| **Teams ready** | Who has already submitted their decisions |
| **Surprise event** | Pick one of the eight preset shocks (investors freeze, demand boom, recession, new competitor, cost shock, talent crunch, new regulation, government stimulus), edit title and description, strength (from ×0.5 to ×2) and duration, and choose whom to hit: everyone, a sector or one team. It takes effect at once and shows in the news |
| **Projector view** | Leaderboard and news full screen, with no confidential data |
| **Teams** table | Cash, runway, MRR, PMF and valuation of every team: useful for the debriefing, not to be projected during the round |
| **Discussion prompts** | The guiding questions of the [session plan](02-session-plan-en.md) for the current phase of the game, plus questions tied to the round's events |

### Exports for assessment

*Settings & save > Data exports for instructors*: three CSV files (history of all teams and rounds, decisions, leaderboard) that open in Excel, Numbers or Google Sheets. With *Final results > Print / PDF* you get the final debrief to attach to the course materials.

**Team report.** In *Final results* each team has a *Team report* button, and during the game the same report can be downloaded from *Round reports*. It is a standalone HTML page, printable to PDF, with numbers, charts, round-by-round decisions, funding, dilemmas, the mentor's warnings and the post-mortem questions: the basis for the teams' final report.

**Guided tour.** At the first solo game, and the first time a team copy is opened in Classroom mode, a two-minute tour of the main screens starts. It can be skipped with one click and replayed from the *Learn* page.

## 4. Running the debriefing

The debriefing is where the real learning happens. A three-step structure that works:

1. **What happened?** Project the leaderboard and the news. Ask two teams with opposite results to describe their decisions.
2. **Why?** Link the results to a concept: *your CAC went up because the market moved past the early adopters and your PMF was below 55: that is the chasm* (it usually happens around mid-game, and the mentor announces it one round ahead). Open the matching card in *Learn*.
3. **And in reality?** A real case or a question: *which startup do you know that scaled before reaching PMF?*

The interaction mechanics provide great debriefing prompts:

- **Contested investors**: when two teams pitch the same investor and one is left out, the report says so explicitly. It is the moment to talk about *dry powder* and about how investors compare opportunities.
- **Partnerships and acquisitions between teams** (*Deals* tab): have the teams tell the story of the negotiation. Who proposed, who accepted and why? In an acquisition, was the price fair given the sellers' waterfall and the buyer's cash?
- **External competitors**: their moves appear in the news at the start of the round. Ask the teams in the affected sector how they reacted (price, value, niche).

Avoid rewarding only the team at the top of the leaderboard: give credit to well-argued decisions even when the outcome was unlucky (the simulation contains uncertainty on purpose).

## 5. Common problems

| Problem | Solution |
|---|---|
| macOS: *the app can't be opened because the developer cannot be verified* | Right-click the app > Open > Open. On macOS 15 or later: System Settings > Privacy & Security > Open Anyway |
| Windows: SmartScreen warning | *More info* > *Run anyway* |
| University computers without installation rights | Use `FoundersDilemma-web.html` in Chrome, Edge, Firefox or Safari, or the online version |
| A team sent the wrong file | The console flags it (*It belongs to another game* or *It is for round N*); the team exports again from its own game |
| A team did not submit | Advance anyway: the team runs on autopilot and loses ground (development and sales at 75% of capacity; morale, investor confidence and problem clarity falling; the cost grows with every consecutive round skipped). If the absence is justified, ask the team to send its decisions even unchanged, or in Hot-seat submit them yourself on the team's behalf: one submission, even with no changes, is enough to avoid the penalty |
| A team entered a decision by mistake | Before advancing you can import a new file from that team: it replaces the previous one |
| You want to go back one round | Start again from the previous round's game file (always keep the exported files) or from a copy saved in *Settings & save* |
| A team went bankrupt early | It stays in the game as an observer: ask it for an early post-mortem and to act as *board advisor* to another team |
| The instructor's computer breaks down | Every exported game file is a complete backup: open it on another computer with *Open game file* |

## 6. Data and privacy

The game uses no accounts and sends nothing over the network. Saves are kept in the local database of the app (or of the browser) on each computer. Game files contain the team names and, if entered, the students' names and the photos uploaded as founder avatars: in Classroom mode they reach every team, so ask for consent before using real photos, or have the students use the drawn avatars. For teaching research on the exported CSV files, follow your university's rules (informed consent, anonymization).

## 7. Integrity of graded games

The game is designed for learning, not as a cheat-proof exam. The game file you share in Classroom mode is a complete copy of the game: anyone who opens it with *Open game file* instead of *Join a class* can try different decisions and see the results in advance, and *Join a class* does not check who picks which team. The PIN protects the console from casual use, not from a determined student. For this reason:

- assess mainly the decision memos, the final report and the reasoning (see [Assessment and rubrics](05-assessment-and-rubrics-en.md)), not only the position on the leaderboard;
- if the leaderboard counts towards the grade, play the rounds in class within the timer, or in Hot-seat on your computer;
- keep the decision files you receive: they show who handed in what, and when.
