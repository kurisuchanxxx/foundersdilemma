# VentureSim

**A business simulation game for macOS** where 2-10 players build and compete as startup founders over 10 rounds (5 years, 2 semesters each).

## Features

### Core Gameplay
- **10 Rounds over 5 Years**: Each year divided into H1 (semester 1) and H2 (semester 2)
- **2-10 Players**: Human vs Bot or Hot-Seat multiplayer
- **Game Master Mode**: In Hot-Seat, GM controls turn duration (24h or 48h) and advances rounds when ready
- **Strategic Decisions**: Budget allocation (R&D, Marketing, Ops), pricing, GTM strategy, team hiring, fundraising, and exit opportunities
- **4 Sectors**: SaaS B2B, Consumer App, E-commerce D2C, DeepTech (each with unique economics)
- **6 Founder Archetypes**: Hacker, Hustler, Designer, Analyst, Visionary, Operator (with unique multipliers)
- **Team Management**: Hire from 30+ candidates across 8 roles (Engineer, Product, Designer, Growth, Sales, Ops, Customer Success, Finance)
- **Dynamic Events**: Global, player-specific, and team events affecting gameplay
- **Metrics Tracking**: Cash, burn, runway, CAC, LTV, churn, revenue, valuation, and more
- **Exit Opportunities**: Accept acquisition offers or compete for highest valuation
- **Deterministic Simulation**: Seeded RNG ensures reproducible games

### Architecture
- **MVVM Pattern**: Clean separation between UI (SwiftUI) and logic
- **Pure Simulation Core**: No SwiftUI dependencies in `SimulationCore/`
- **Transport Layer**: Modular design supporting Local (Hot-Seat), and future Online modes
- **Serializable State**: Codable GameState for save/load (planned)
- **Apple Design**: Native macOS SwiftUI with SF Symbols, cards, adaptive layouts, dark/light mode support

---

## Project Structure

```
VentureSim/
├── VentureSim/                          # App UI (SwiftUI)
│   ├── VentureSimApp.swift
│   ├── Views/
│   │   ├── MainView.swift
│   │   ├── Setup/
│   │   │   ├── GameSetupView.swift
│   │   │   └── PlayerSetupView.swift
│   │   ├── Game/
│   │   │   ├── DashboardView.swift
│   │   │   ├── DecisionsView.swift
│   │   │   ├── TeamView.swift
│   │   │   ├── EventsView.swift
│   │   │   ├── LeaderboardView.swift
│   │   │   └── Components/
│   │   │       └── MetricCard.swift
│   │   └── Settings/
│   │       └── SettingsView.swift
│   └── ViewModels/
│       └── GameViewModel.swift
├── SimulationCore/                      # Pure Swift logic (no SwiftUI)
│   ├── Models/
│   │   ├── GameState.swift
│   │   ├── Player.swift
│   │   ├── Sector.swift
│   │   ├── FounderProfile.swift
│   │   ├── TeamMember.swift
│   │   ├── Candidate.swift
│   │   ├── Decision.swift
│   │   ├── Metrics.swift
│   │   └── Event.swift
│   ├── Engine/
│   │   ├── SimulationEngine.swift
│   │   ├── MetricsCalculator.swift
│   │   ├── ValuationCalculator.swift
│   │   ├── TeamSystem.swift
│   │   ├── EventGenerator.swift
│   │   └── BotAI.swift
│   ├── Transport/
│   │   ├── GameTransport.swift
│   │   ├── LocalTransport.swift
│   │   └── (Future) OnlineTransport.swift
│   ├── Data/
│   │   └── candidates.json
│   └── RNG/
│       └── SeededRandom.swift
└── SimulationCoreTests/
    └── (Test files - to be implemented)
```

---

## How to Build and Run

### Prerequisites
- **macOS 14.0 (Sonoma)** or later
- **Xcode 15.0** or later
- Swift 5.9+

### Step 1: Create Xcode Project

Since the project files are pure Swift/SwiftUI source files, you need to create an Xcode project manually:

#### Option A: Using Xcode GUI (Recommended)

1. **Open Xcode**
2. **File → New → Project**
3. Select **macOS → App**
4. Configure:
   - Product Name: `VentureSim`
   - Team: Your team (or leave as-is)
   - Organization Identifier: `com.yourdomain.venturesim`
   - Interface: **SwiftUI**
   - Language: **Swift**
   - Storage: **None**
   - Uncheck "Include Tests" for now
5. Save in the existing `VentureSim` folder (Xcode will detect existing files)
6. **Delete** the auto-generated `VentureSimApp.swift` and `ContentView.swift` if Xcode created duplicates
7. **Add Files**: Right-click on project navigator → **Add Files to "VentureSim"**
   - Add the existing `VentureSim/` folder (make sure "Create groups" is selected)
   - Add the `SimulationCore/` folder
   - Add `SimulationCore/Data/candidates.json` as a resource (check "Copy items if needed")
8. **Set Deployment Target**: Project Settings → General → Minimum Deployments → **macOS 14.0**

#### Option B: Manual Setup (Advanced)

If you're comfortable with Xcode project files:

1. Create a new macOS app project as above
2. Copy all `.swift` files from `/Users/christian/VentureSim/VentureSim/` to the Xcode project's `VentureSim` target
3. Copy all `.swift` files from `/Users/christian/VentureSim/SimulationCore/` into the project (create a separate group)
4. Add `candidates.json` to the project as a resource (Build Phases → Copy Bundle Resources)

### Step 2: Configure Build Settings

1. Select project in Navigator → VentureSim target
2. **Build Settings** tab:
   - Set **Swift Language Version** to **Swift 5**
   - Enable **Strict Concurrency Checking** (optional, recommended)
3. **Signing & Capabilities**:
   - Select your team or use automatic signing
   - App Sandbox: **Enabled** (default for macOS apps)

### Step 3: Add candidates.json to Bundle

1. Select `candidates.json` in Project Navigator
2. **File Inspector** (right sidebar): Check that **Target Membership** includes `VentureSim`
3. Verify in **Build Phases** → **Copy Bundle Resources** that `candidates.json` is listed

### Step 4: Build and Run

1. Select scheme: **VentureSim → My Mac**
2. Press **Cmd + R** or click **Run**
3. The app should compile and launch

**Expected Behavior:**
- Game Setup screen appears
- Choose mode (Solo vs Bot or Hot-Seat)
- Set number of players (2-10)
- In Hot-Seat mode, choose turn duration (24h or 48h)
- Configure each player (company, sector, founder profile, etc.)
- Start game → Dashboard with metrics, sidebar navigation

---

## How to Play

### Game Setup
1. **Choose Mode**:
   - **Solo vs Bot**: You vs AI opponents (1 human, up to 9 bots)
   - **Hot-Seat**: 2-10 humans on the same Mac, with Game Master gating
2. **Player Setup**:
   - Company name, product name
   - Sector: SaaS B2B / Consumer App / E-commerce / DeepTech
   - Risk level: Low / Medium / High (affects event frequency and rewards)
   - Founder + optional Co-founder profiles
3. **Start Game**

### Gameplay (Each Round)
Each round = 1 semester (H1 or H2 of a year).

**Player Actions** (via Decisions tab):
- **Budget Allocation**:
  - R&D Spend: Develops MVP, improves product quality
  - Marketing Spend: Acquires customers (influences CAC)
  - Operations Spend: Improves efficiency, runway
- **MVP Development**: Set months to spend on product (affects time-to-market)
- **Pricing**: Set ARPA (Average Revenue Per Account)
- **GTM Focus**: Brand / Performance / Partnership (affects CAC/LTV multipliers)
- **Team Management** (Team tab):
  - Hire candidates (Engineers, Product, Designers, Growth, Sales, Ops, CS, Finance)
  - Fire team members
  - Each hire affects efficiency multipliers and burn rate
- **Fundraising** (optional): Raise seed/bridge rounds (dilutes equity)
- **Exit** (if offered): Accept acquisition offer or continue

**Simulation**:
1. All players submit decisions (or timer expires in Hot-Seat)
2. **Game Master clicks "Advance Round"** (in Hot-Seat) or auto-advances (Solo)
3. Simulation calculates:
   - New customers (based on marketing spend / CAC)
   - Revenue (customers × pricing × gross margin)
   - Burn rate (R&D + Marketing + Ops + team salaries)
   - Cash update (revenue - burn)
   - Runway (cash / burn rate)
   - MVP progress
   - Churn (lost customers)
   - Valuation (revenue × multiple × bonuses)
4. **Events** triggered:
   - 1 global event per round (affects all players)
   - 0-2 player-specific events (positive/negative)
   - Team events (burnout, resignation, morale boost)
5. **Exit offers** may appear (based on valuation and RNG)
6. Leaderboard updates

**Win Condition**:
- After **Round 10** (Year 5 H2), game ends
- Winner: Highest valuation
- Tie-break 1: Who accepted exit earliest (if multiple exits)
- Tie-break 2: Cash on hand

---

## Metrics Explained

| Metric | Description |
|--------|-------------|
| **Cash** | Current runway capital |
| **Burn Rate** | Monthly spend (R&D + Marketing + Ops + salaries) |
| **Runway** | Months until cash runs out (cash / burn) |
| **CAC** | Customer Acquisition Cost (marketing spend / new customers) |
| **LTV** | Lifetime Value (pricing × retention × quality bonuses) |
| **Churn** | % of customers lost per period |
| **Revenue** | customers × pricing × gross margin |
| **Valuation** | revenue × sector multiple × growth/team/quality bonuses |
| **Equity Owned** | % ownership after dilution from funding rounds |

---

## Game Master Mode (Hot-Seat)

In Hot-Seat mode:
- **GM Dashboard** shows who is ready (submitted decisions)
- **Turn Timer**: 24h or 48h deadline (configurable at setup)
- **Manual Advance**: GM clicks "Advance to Next Round" when:
  - Timer expires, OR
  - GM decides to proceed early
- **No automatic READY gating**: Players can take full time or be forced to proceed by GM
- **Custom Events** (future): GM can inject surprise events

---

## Founder Profiles

| Profile | Strengths | Weaknesses |
|---------|-----------|------------|
| **Hacker** | +50% R&D efficiency, +40% product quality | -20% marketing, -30% sales |
| **Hustler** | +50% sales, +40% marketing, +30% fundraising | -10% product quality |
| **Designer** | +50% product quality, +30% marketing | -20% operations |
| **Analyst** | +30% operations, +20% marketing | Balanced, no major weakness |
| **Visionary** | +50% fundraising, +30% product quality | -30% operations |
| **Operator** | +50% operations, +20% sales | -10% fundraising |

---

## Future Features (Phase 2)

- **Online Multiplayer**: WebSocket-based relay server for remote play
- **Persistence**: Save/load games
- **Advanced Events**: More complex event chains, GM custom events
- **Expanded Team**: More candidates, skill trees, promotions
- **Fundraising Details**: Term sheets, investor profiles, dilution modeling
- **Analytics Dashboard**: Charts, historical trends, comparative metrics
- **Achievements**: Badges for milestones (e.g., "Unicorn", "Exit King")

---

## Development Notes

### Testing
Unit tests for `SimulationCore` (to be implemented):
```bash
swift test
```

### Build Release
```bash
xcodebuild -scheme VentureSim -configuration Release build
```

Output: `build/Release/VentureSim.app`

### Create DMG (Future)
Use `create-dmg` or `hdiutil` to package `.app` as installer.

---

## Credits

**Design**: Apple-like macOS aesthetic with SF Symbols
**Architecture**: MVVM, deterministic simulation core
**Candidates Data**: 30 unique team members with stats, perks, and risk tags

---

## License

MIT License (or specify your license)

---

## Support

For issues, feature requests, or questions:
- Open an issue on GitHub
- Contact: your-email@example.com

---

**Enjoy building your startup empire!** 🚀
