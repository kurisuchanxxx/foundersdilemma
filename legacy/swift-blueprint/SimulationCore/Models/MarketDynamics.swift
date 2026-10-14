import Foundation

// MARK: - Market Dynamics (Endogenous + Exogenous)

// MARK: - Adoption Curve

enum AdopterSegment: String, Codable, CaseIterable {
    case innovators = "Innovators"           // 2.5%
    case earlyAdopters = "Early Adopters"    // 13.5%
    case earlyMajority = "Early Majority"    // 34%
    case lateMajority = "Late Majority"      // 34%
    case laggards = "Laggards"               // 16%

    var percentage: Double {
        switch self {
        case .innovators: return 0.025
        case .earlyAdopters: return 0.135
        case .earlyMajority: return 0.34
        case .lateMajority: return 0.34
        case .laggards: return 0.16
        }
    }

    var acquisitionDifficulty: Double {
        switch self {
        case .innovators: return 0.3        // Easy to acquire
        case .earlyAdopters: return 0.5
        case .earlyMajority: return 0.7
        case .lateMajority: return 0.9
        case .laggards: return 1.2          // Very hard
        }
    }

    var churnResistance: Double {
        switch self {
        case .innovators: return 0.4        // High churn
        case .earlyAdopters: return 0.6
        case .earlyMajority: return 0.8
        case .lateMajority: return 0.9
        case .laggards: return 0.95         // Very loyal once adopted
        }
    }

    var ltmMultiplier: Double {
        switch self {
        case .innovators: return 0.8        // Lower LTV
        case .earlyAdopters: return 1.0
        case .earlyMajority: return 1.2
        case .lateMajority: return 1.3
        case .laggards: return 1.5          // Highest LTV
        }
    }

    static func currentSegment(customers: Int, tam: Int) -> AdopterSegment {
        let penetration = Double(customers) / Double(tam)

        if penetration < 0.025 {
            return .innovators
        } else if penetration < 0.16 { // 2.5% + 13.5%
            return .earlyAdopters
        } else if penetration < 0.5 { // 16% + 34%
            return .earlyMajority
        } else if penetration < 0.84 { // 50% + 34%
            return .lateMajority
        } else {
            return .laggards
        }
    }
}

struct MarketSegmentation: Codable, Equatable {
    var totalAddressableMarket: Int
    var penetration: [AdopterSegment: Double] // % penetrated per segment

    init(totalAddressableMarket: Int, penetration: [AdopterSegment: Double] = [:]) {
        self.totalAddressableMarket = totalAddressableMarket
        self.penetration = penetration
    }

    func availableCustomers(segment: AdopterSegment) -> Int {
        let segmentSize = Double(totalAddressableMarket) * segment.percentage
        let alreadyPenetrated = penetration[segment] ?? 0.0
        return Int(segmentSize * (1.0 - alreadyPenetrated))
    }

    var currentSegment: AdopterSegment {
        let totalCustomers = penetration.reduce(0.0) { result, pair in
            let segmentSize = Double(totalAddressableMarket) * pair.key.percentage
            return result + (segmentSize * pair.value)
        }
        return AdopterSegment.currentSegment(
            customers: Int(totalCustomers),
            tam: totalAddressableMarket
        )
    }

    mutating func updatePenetration(newCustomers: Int, segment: AdopterSegment) {
        let segmentSize = Double(totalAddressableMarket) * segment.percentage
        guard segmentSize > 0 else { return }

        let newPenetration = Double(newCustomers) / segmentSize
        penetration[segment, default: 0.0] += newPenetration
        penetration[segment] = min(1.0, penetration[segment, default: 0.0])
    }
}

// MARK: - Network Effects

struct NetworkEffects: Codable, Equatable {
    var enabled: Bool
    var strength: NetworkEffectStrength
    var currentMultiplier: Double

    init(
        enabled: Bool = false,
        strength: NetworkEffectStrength = .moderate,
        currentMultiplier: Double = 1.0
    ) {
        self.enabled = enabled
        self.strength = strength
        self.currentMultiplier = currentMultiplier
    }

    mutating func updateMultiplier(users: Int) {
        guard enabled else {
            currentMultiplier = 1.0
            return
        }

        currentMultiplier = NetworkEffectsCalculator.calculateValueMultiplier(
            users: users,
            strength: strength
        )
    }
}

enum NetworkEffectStrength: String, Codable, CaseIterable {
    case weak = "Weak"           // Content platforms
    case moderate = "Moderate"   // Social networks
    case strong = "Strong"       // Marketplaces

    var exponent: Double {
        switch self {
        case .weak: return 1.1       // Logarithmic
        case .moderate: return 1.3   // Sub-linear
        case .strong: return 1.7     // Near-quadratic
        }
    }
}

// MARK: - Exogenous Events

enum ExogenousEventType: String, Codable {
    case macroTrend = "Macro Trend"
    case techDisruption = "Tech Disruption"
    case fundingClimate = "Funding Climate"
    case talentMarket = "Talent Market"
    case blackSwan = "Black Swan"
    case regulatory = "Regulatory Change"
}

struct ExogenousEvent: Codable, Equatable, Identifiable {
    let id: String
    let type: ExogenousEventType
    let name: String
    let description: String
    let probability: Double // Per period
    let duration: Int // Periods
    let effects: ExogenousEffects

    init(
        id: String = UUID().uuidString,
        type: ExogenousEventType,
        name: String,
        description: String,
        probability: Double,
        duration: Int = 1,
        effects: ExogenousEffects
    ) {
        self.id = id
        self.type = type
        self.name = name
        self.description = description
        self.probability = probability
        self.duration = duration
        self.effects = effects
    }
}

struct ExogenousEffects: Codable, Equatable {
    var cacMultiplier: Double?
    var ltvMultiplier: Double?
    var churnDelta: Double?
    var fundingAvailability: Double? // Multiplier for fundraising success
    var talentPoolMultiplier: Double? // More/fewer candidates
    var salaryPressure: Double? // Multiplier on salaries
    var demandShock: Double? // Sudden customer surge/drop
    var competitorIntensity: Double? // More/less competition

    init(
        cacMultiplier: Double? = nil,
        ltvMultiplier: Double? = nil,
        churnDelta: Double? = nil,
        fundingAvailability: Double? = nil,
        talentPoolMultiplier: Double? = nil,
        salaryPressure: Double? = nil,
        demandShock: Double? = nil,
        competitorIntensity: Double? = nil
    ) {
        self.cacMultiplier = cacMultiplier
        self.ltvMultiplier = ltvMultiplier
        self.churnDelta = churnDelta
        self.fundingAvailability = fundingAvailability
        self.talentPoolMultiplier = talentPoolMultiplier
        self.salaryPressure = salaryPressure
        self.demandShock = demandShock
        self.competitorIntensity = competitorIntensity
    }
}

// MARK: - Market State

struct MarketState: Codable, Equatable {
    var segmentation: MarketSegmentation
    var networkEffects: NetworkEffects
    var activeExogenousEvents: [ExogenousEvent]
    var competitorCount: Int
    var marketMaturity: MarketMaturity

    init(
        segmentation: MarketSegmentation,
        networkEffects: NetworkEffects = NetworkEffects(),
        activeExogenousEvents: [ExogenousEvent] = [],
        competitorCount: Int = 5,
        marketMaturity: MarketMaturity = .emerging
    ) {
        self.segmentation = segmentation
        self.networkEffects = networkEffects
        self.activeExogenousEvents = activeExogenousEvents
        self.competitorCount = competitorCount
        self.marketMaturity = marketMaturity
    }

    mutating func updateMaturity(totalCustomersInMarket: Int) {
        let penetration = Double(totalCustomersInMarket) / Double(segmentation.totalAddressableMarket)

        if penetration < 0.05 {
            marketMaturity = .emerging
        } else if penetration < 0.2 {
            marketMaturity = .growing
        } else if penetration < 0.6 {
            marketMaturity = .mature
        } else {
            marketMaturity = .saturated
        }
    }
}

enum MarketMaturity: String, Codable {
    case emerging = "Emerging"
    case growing = "Growing"
    case mature = "Mature"
    case saturated = "Saturated"

    var competitionIntensity: Double {
        switch self {
        case .emerging: return 0.5
        case .growing: return 0.8
        case .mature: return 1.2
        case .saturated: return 1.8
        }
    }

    var cacMultiplier: Double {
        switch self {
        case .emerging: return 1.2 // Harder to educate market
        case .growing: return 1.0
        case .mature: return 1.1 // More noise
        case .saturated: return 1.5 // Very expensive
        }
    }
}
