import Foundation

enum PlayerType: String, Codable {
    case human = "Human"
    case bot = "Bot"
}

struct Player: Codable, Identifiable, Equatable {
    let id: String
    let type: PlayerType
    var companyName: String
    let sector: Sector
    var productName: String
    let riskLevel: RiskLevel
    let founderProfile: FounderProfile
    let cofounderProfile: FounderProfile?

    var team: [TeamMember]
    var metrics: Metrics
    var decisionsHistory: [Decision]
    var currentDecision: Decision?

    var isReady: Bool

    // PROFESSIONAL SYSTEMS ✨
    var productCanvas: ProductCanvas
    var pmfMetrics: PMFMetrics
    var technicalDebt: TechnicalDebt
    var developmentMetrics: DevelopmentMetrics
    var founderMetrics: FounderMetrics
    var reputation: Reputation
    var achievements: [PlayerAchievement]
    var hiredCandidateIds: Set<String> // Track hired candidates

    init(
        id: String = UUID().uuidString,
        type: PlayerType,
        companyName: String,
        sector: Sector,
        productName: String,
        riskLevel: RiskLevel,
        founderProfile: FounderProfile,
        cofounderProfile: FounderProfile? = nil
    ) {
        self.id = id
        self.type = type
        self.companyName = companyName
        self.sector = sector
        self.productName = productName
        self.riskLevel = riskLevel
        self.founderProfile = founderProfile
        self.cofounderProfile = cofounderProfile
        self.team = []
        self.metrics = Metrics.zero
        self.metrics.cash = sector.parameters.initialBudget
        self.metrics.equityOwned = 1.0
        self.decisionsHistory = []
        self.currentDecision = nil
        self.isReady = false

        // Initialize professional systems ✨
        self.productCanvas = ProductCanvas(
            valueProposition: "Solving a problem for \(sector.rawValue) customers"
        )
        self.pmfMetrics = PMFMetrics()
        self.technicalDebt = TechnicalDebt()
        self.developmentMetrics = DevelopmentMetrics()
        self.founderMetrics = FounderMetrics()
        self.reputation = Reputation()
        self.achievements = []
        self.hiredCandidateIds = []
    }

    var founderMultipliers: FounderProfile.Multipliers {
        var base = founderProfile.multipliers
        if let cofounder = cofounderProfile {
            let coMulti = cofounder.multipliers
            base = FounderProfile.Multipliers(
                rndEfficiency: (base.rndEfficiency + coMulti.rndEfficiency) / 2.0,
                marketingEfficiency: (base.marketingEfficiency + coMulti.marketingEfficiency) / 2.0,
                salesEfficiency: (base.salesEfficiency + coMulti.salesEfficiency) / 2.0,
                operationsEfficiency: (base.operationsEfficiency + coMulti.operationsEfficiency) / 2.0,
                productQuality: (base.productQuality + coMulti.productQuality) / 2.0,
                fundraisingBonus: (base.fundraisingBonus + coMulti.fundraisingBonus) / 2.0
            )
        }
        return base
    }

    mutating func resetReady() {
        isReady = false
        currentDecision = nil
    }
}
