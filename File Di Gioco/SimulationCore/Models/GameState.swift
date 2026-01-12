import Foundation

enum GameMode: String, Codable {
    case soloVsBot = "Solo vs Bot"
    case hotSeat = "Hot Seat"
    case onlineBeta = "Online (Beta)"
}

enum PeriodType: String, Codable {
    case quarterly = "Quarterly"      // 3 months
    case semiannual = "Semiannual"    // 6 months

    var months: Int {
        switch self {
        case .quarterly: return 3
        case .semiannual: return 6
        }
    }

    var label: String {
        switch self {
        case .quarterly: return "Q"
        case .semiannual: return "H"
        }
    }
}

struct GameConfig: Codable {
    let mode: GameMode
    let playerCount: Int
    let botCount: Int
    let seed: UInt64
    let totalRounds: Int
    var turnDurationHours: Int

    init(mode: GameMode, playerCount: Int, botCount: Int = 0, seed: UInt64 = UInt64.random(in: 0...UInt64.max), totalRounds: Int = 10, turnDurationHours: Int = 48) {
        self.mode = mode
        self.playerCount = playerCount
        self.botCount = botCount
        self.seed = seed
        self.totalRounds = totalRounds
        self.turnDurationHours = turnDurationHours
    }

    var totalYears: Int {
        return totalRounds / 2
    }

    // Calculate period type based on round number
    func periodType(for round: Int) -> PeriodType {
        return round <= 3 ? .quarterly : .semiannual
    }

    func monthsInPeriod(for round: Int) -> Int {
        return periodType(for: round).months
    }
}

struct GameState: Codable {
    let id: String
    let config: GameConfig
    var players: [Player]
    var currentRound: Int
    var events: [Event]
    var isGameOver: Bool

    var candidatePool: [Candidate]
    var turnDeadline: Date?

    // PROFESSIONAL SYSTEMS ✨
    var candidateCVs: [String: CandidateCV] // candidateId → CV
    var candidatePreferences: [String: CandidatePreferences] // candidateId → preferences
    var activeAuctions: [HiringAuction]
    var marketState: MarketState
    var activeExogenousEvents: [ExogenousEvent]
    var auctionOutcomes: [AuctionOutcome] // Historical auction results

    init(
        id: String = UUID().uuidString,
        config: GameConfig,
        players: [Player] = [],
        candidatePool: [Candidate] = []
    ) {
        self.id = id
        self.config = config
        self.players = players
        self.currentRound = 1
        self.events = []
        self.isGameOver = false
        self.candidatePool = candidatePool
        self.turnDeadline = nil

        // Initialize professional systems ✨
        self.candidateCVs = [:]
        self.candidatePreferences = [:]
        self.activeAuctions = []

        // Initialize market state with reasonable TAM based on sector
        let tam = 10_000_000 // 10M potential customers
        self.marketState = MarketState(
            segmentation: MarketSegmentation(totalAddressableMarket: tam),
            networkEffects: NetworkEffects(enabled: false),
            activeExogenousEvents: [],
            competitorCount: 5,
            marketMaturity: .emerging
        )
        self.activeExogenousEvents = []
        self.auctionOutcomes = []
    }

    var currentYear: Int {
        // Calculate actual year based on variable period lengths
        var totalMonths = 0
        for round in 1...currentRound {
            totalMonths += config.monthsInPeriod(for: round)
        }
        return (totalMonths / 12) + 1
    }

    var currentPeriodType: PeriodType {
        return config.periodType(for: currentRound)
    }

    var monthsInCurrentPeriod: Int {
        return config.monthsInPeriod(for: currentRound)
    }

    var roundLabel: String {
        let periodType = config.periodType(for: currentRound)

        if currentRound <= 3 {
            // Quarterly: Q1, Q2, Q3
            return "Month \((currentRound - 1) * 3 + 1)-\(currentRound * 3) (Q\(currentRound))"
        } else {
            // Semiannual: calculate based on total months
            var totalMonths = 0
            for round in 1...currentRound {
                totalMonths += config.monthsInPeriod(for: round)
            }
            let year = (totalMonths / 12) + 1
            let semester = ((currentRound - 3) % 2) + 1
            return "Year \(year) - H\(semester)"
        }
    }

    var isAllPlayersReady: Bool {
        players.filter { $0.type == .human }.allSatisfy { $0.isReady }
    }

    var isTurnDeadlineExpired: Bool {
        guard let deadline = turnDeadline else { return false }
        return Date() >= deadline
    }

    mutating func startTurnTimer() {
        let hours = config.turnDurationHours
        turnDeadline = Date().addingTimeInterval(TimeInterval(hours * 3600))
    }

    var leaderboard: [Player] {
        players.sorted { p1, p2 in
            if p1.metrics.exitAccepted && !p2.metrics.exitAccepted {
                return true
            }
            if !p1.metrics.exitAccepted && p2.metrics.exitAccepted {
                return false
            }
            if p1.metrics.exitAccepted && p2.metrics.exitAccepted {
                if let y1 = p1.metrics.exitYear, let y2 = p2.metrics.exitYear {
                    if y1 != y2 {
                        return y1 < y2
                    }
                }
                return p1.metrics.exitValue > p2.metrics.exitValue
            }
            if p1.metrics.valuation != p2.metrics.valuation {
                return p1.metrics.valuation > p2.metrics.valuation
            }
            return p1.metrics.cash > p2.metrics.cash
        }
    }

    var winner: Player? {
        guard isGameOver else { return nil }
        return leaderboard.first
    }

    mutating func resetAllPlayersReady() {
        for i in 0..<players.count {
            players[i].resetReady()
        }
    }

    mutating func advanceRound() {
        currentRound += 1
        if currentRound > config.totalRounds {
            isGameOver = true
        }
        resetAllPlayersReady()
        startTurnTimer()
    }
}
