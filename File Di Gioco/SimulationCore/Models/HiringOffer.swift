import Foundation

// MARK: - Hiring Offer Models

struct HiringOffer: Codable, Equatable, Identifiable {
    let id: String
    let playerId: String
    let candidateId: String
    let period: Int

    // Compensation
    let quarterlySalary: Double // Paid per period in quarters 1-3
    let semiannualSalary: Double // Paid per period in periods 4-10
    let equityPercentage: Double // 0.01 = 1%
    let vestingYears: Int // Typically 4
    let cliffMonths: Int // Typically 12

    // Perks
    let remoteAllowed: Bool
    let signingBonus: Double
    let title: String // e.g., "Senior Engineer", "Staff Engineer"

    // Metadata
    let timestamp: Date

    init(
        id: String = UUID().uuidString,
        playerId: String,
        candidateId: String,
        period: Int,
        quarterlySalary: Double,
        semiannualSalary: Double,
        equityPercentage: Double,
        vestingYears: Int = 4,
        cliffMonths: Int = 12,
        remoteAllowed: Bool = true,
        signingBonus: Double = 0,
        title: String,
        timestamp: Date = Date()
    ) {
        self.id = id
        self.playerId = playerId
        self.candidateId = candidateId
        self.period = period
        self.quarterlySalary = quarterlySalary
        self.semiannualSalary = semiannualSalary
        self.equityPercentage = equityPercentage
        self.vestingYears = vestingYears
        self.cliffMonths = cliffMonths
        self.remoteAllowed = remoteAllowed
        self.signingBonus = signingBonus
        self.title = title
        self.timestamp = timestamp
    }

    func annualSalary() -> Double {
        // Approximate annual salary (4 quarters or 2 semesters)
        return quarterlySalary * 4
    }

    func totalCompensation(startupValuation: Double) -> Double {
        let estimatedEquityValue = startupValuation * equityPercentage
        return annualSalary() + (estimatedEquityValue / Double(vestingYears)) + signingBonus
    }
}

// MARK: - Startup Snapshot (for candidate evaluation)

struct StartupSnapshot: Codable, Equatable {
    let playerId: String
    let companyName: String
    let productName: String
    let sector: String

    // Financial health
    let cash: Double
    let runway: Double // months
    let burnRate: Double
    let revenue: Double

    // Traction
    let customers: Int
    let pmfScore: Double // 0-100
    let periodsSinceLaunch: Int

    // Team
    let headcount: Int
    let morale: Double // 0-1
    let averageTenure: Double // years

    // Reputation & Stage
    let reputation: Double // 0-100
    let valuation: Double
    let fundingRaised: Double
    let lastRoundType: String? // "Pre-Seed", "Seed", etc.

    // Founder
    let founderStress: Double // 0-1

    init(
        playerId: String,
        companyName: String,
        productName: String,
        sector: String,
        cash: Double,
        runway: Double,
        burnRate: Double,
        revenue: Double,
        customers: Int,
        pmfScore: Double,
        periodsSinceLaunch: Int,
        headcount: Int,
        morale: Double,
        averageTenure: Double,
        reputation: Double,
        valuation: Double,
        fundingRaised: Double,
        lastRoundType: String? = nil,
        founderStress: Double
    ) {
        self.playerId = playerId
        self.companyName = companyName
        self.productName = productName
        self.sector = sector
        self.cash = cash
        self.runway = runway
        self.burnRate = burnRate
        self.revenue = revenue
        self.customers = customers
        self.pmfScore = pmfScore
        self.periodsSinceLaunch = periodsSinceLaunch
        self.headcount = headcount
        self.morale = morale
        self.averageTenure = averageTenure
        self.reputation = reputation
        self.valuation = valuation
        self.fundingRaised = fundingRaised
        self.lastRoundType = lastRoundType
        self.founderStress = founderStress
    }

    var stage: StartupStage {
        if revenue < 10_000 && customers < 100 {
            return .ideation
        } else if revenue < 100_000 && customers < 1000 {
            return .earlyTraction
        } else if revenue < 1_000_000 {
            return .pmfSearch
        } else if revenue < 10_000_000 {
            return .scaling
        } else {
            return .growth
        }
    }

    var redFlags: [String] {
        var flags: [String] = []

        if runway < 3 {
            flags.append("Critical runway: < 3 months")
        } else if runway < 6 {
            flags.append("Low runway: < 6 months")
        }

        if morale < 0.4 {
            flags.append("Very low team morale")
        } else if morale < 0.6 {
            flags.append("Low team morale")
        }

        if periodsSinceLaunch > 6 && customers < 100 {
            flags.append("No traction after 18+ months")
        }

        if founderStress > 0.85 {
            flags.append("Founder burnout risk")
        }

        if burnRate > cash && revenue < burnRate * 0.3 {
            flags.append("Unsustainable burn vs revenue")
        }

        return flags
    }

    var greenFlags: [String] {
        var flags: [String] = []

        if pmfScore > 70 {
            flags.append("Strong product-market fit")
        }

        if runway > 18 {
            flags.append("Healthy runway: 18+ months")
        }

        if reputation > 70 {
            flags.append("Strong reputation in market")
        }

        if lastRoundType == "Series A" || lastRoundType == "Series B" {
            flags.append("Well-funded: \(lastRoundType ?? "")")
        }

        if morale > 0.8 {
            flags.append("Excellent team morale")
        }

        return flags
    }
}

enum StartupStage: String, Codable {
    case ideation = "Ideation"
    case earlyTraction = "Early Traction"
    case pmfSearch = "PMF Search"
    case scaling = "Scaling"
    case growth = "Growth"

    var riskLevel: Double {
        switch self {
        case .ideation: return 0.95
        case .earlyTraction: return 0.80
        case .pmfSearch: return 0.60
        case .scaling: return 0.35
        case .growth: return 0.15
        }
    }

    var attractiveness: Double {
        switch self {
        case .ideation: return 0.3 // High risk, potential upside
        case .earlyTraction: return 0.5
        case .pmfSearch: return 0.7
        case .scaling: return 0.9 // Sweet spot: proven + upside
        case .growth: return 0.6 // Safer but less upside
        }
    }
}

// MARK: - Auction Models

enum AuctionStatus: String, Codable {
    case pending = "Pending"
    case evaluating = "Evaluating"
    case accepted = "Accepted"
    case rejected = "Rejected"
    case counterOffer = "Counter Offer"
}

struct HiringAuction: Codable, Equatable, Identifiable {
    let id: String
    let candidateId: String
    let period: Int
    var offers: [String: HiringOffer] // playerId → offer
    var status: AuctionStatus
    var winnerPlayerId: String?
    var rejectionReason: String?
    var counterOffer: HiringOffer?

    init(
        id: String = UUID().uuidString,
        candidateId: String,
        period: Int,
        offers: [String: HiringOffer] = [:],
        status: AuctionStatus = .pending,
        winnerPlayerId: String? = nil,
        rejectionReason: String? = nil,
        counterOffer: HiringOffer? = nil
    ) {
        self.id = id
        self.candidateId = candidateId
        self.period = period
        self.offers = offers
        self.status = status
        self.winnerPlayerId = winnerPlayerId
        self.rejectionReason = rejectionReason
        self.counterOffer = counterOffer
    }

    mutating func addOffer(_ offer: HiringOffer) {
        offers[offer.playerId] = offer
    }

    var hasMultipleOffers: Bool {
        offers.count > 1
    }

    var offerCount: Int {
        offers.count
    }
}

enum AuctionResult: Codable, Equatable {
    case won(playerId: String)
    case allRejected(reason: String)
    case counterOffer(newSalary: Double, newEquity: Double)

    enum CodingKeys: String, CodingKey {
        case type, playerId, reason, newSalary, newEquity
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let type = try container.decode(String.self, forKey: .type)

        switch type {
        case "won":
            let playerId = try container.decode(String.self, forKey: .playerId)
            self = .won(playerId: playerId)
        case "allRejected":
            let reason = try container.decode(String.self, forKey: .reason)
            self = .allRejected(reason: reason)
        case "counterOffer":
            let newSalary = try container.decode(Double.self, forKey: .newSalary)
            let newEquity = try container.decode(Double.self, forKey: .newEquity)
            self = .counterOffer(newSalary: newSalary, newEquity: newEquity)
        default:
            throw DecodingError.dataCorruptedError(forKey: .type, in: container, debugDescription: "Unknown AuctionResult type")
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)

        switch self {
        case .won(let playerId):
            try container.encode("won", forKey: .type)
            try container.encode(playerId, forKey: .playerId)
        case .allRejected(let reason):
            try container.encode("allRejected", forKey: .type)
            try container.encode(reason, forKey: .reason)
        case .counterOffer(let newSalary, let newEquity):
            try container.encode("counterOffer", forKey: .type)
            try container.encode(newSalary, forKey: .newSalary)
            try container.encode(newEquity, forKey: .newEquity)
        }
    }
}
