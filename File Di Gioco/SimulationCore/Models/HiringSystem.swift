import Foundation

// MARK: - Hiring Offer

struct HiringOffer: Codable, Equatable, Identifiable {
    let id: String
    let candidateId: String
    let playerId: String
    let period: Int

    // Compensation
    let quarterlySalary: Double
    let semiannualSalary: Double
    let equityPercentage: Double
    let vestingYears: Int
    let cliffMonths: Int

    // Evaluation
    var evaluationScore: Double // 0-100, AI-calculated attractiveness

    init(
        id: String = UUID().uuidString,
        candidateId: String,
        playerId: String,
        period: Int,
        quarterlySalary: Double,
        semiannualSalary: Double,
        equityPercentage: Double,
        vestingYears: Int = 4,
        cliffMonths: Int = 12,
        evaluationScore: Double = 0.0
    ) {
        self.id = id
        self.candidateId = candidateId
        self.playerId = playerId
        self.period = period
        self.quarterlySalary = quarterlySalary
        self.semiannualSalary = semiannualSalary
        self.equityPercentage = equityPercentage
        self.vestingYears = vestingYears
        self.cliffMonths = cliffMonths
        self.evaluationScore = evaluationScore
    }

    var annualSalary: Double {
        return quarterlySalary * 4
    }

    var totalFirstYearCost: Double {
        return annualSalary
    }

    var totalSecondYearCost: Double {
        return annualSalary
    }
}

// MARK: - Counter Offer

struct CounterOffer: Codable, Equatable {
    let requestedQuarterlySalary: Double?
    let requestedEquity: Double?
    let reason: String

    init(
        requestedQuarterlySalary: Double? = nil,
        requestedEquity: Double? = nil,
        reason: String
    ) {
        self.requestedQuarterlySalary = requestedQuarterlySalary
        self.requestedEquity = requestedEquity
        self.reason = reason
    }
}

// MARK: - Auction Outcome

struct AuctionOutcome: Codable, Equatable, Identifiable {
    let id: String
    let candidateId: String
    let period: Int
    let candidateName: String
    let seniority: Seniority
    let role: TeamRole

    let yourOffer: HiringOffer
    let result: AuctionResult

    // All offers made for this candidate
    let offers: [HiringOffer]

    // Competition details
    let competingPlayerIds: [String]
    let winningPlayerId: String?
    let winningOffer: HiringOffer?

    // Rejection details
    let rejectionReason: String?
    let counterOffer: CounterOffer?

    init(
        id: String = UUID().uuidString,
        candidateId: String,
        period: Int,
        candidateName: String,
        seniority: Seniority,
        role: TeamRole,
        yourOffer: HiringOffer,
        result: AuctionResult,
        offers: [HiringOffer] = [],
        competingPlayerIds: [String] = [],
        winningPlayerId: String? = nil,
        winningOffer: HiringOffer? = nil,
        rejectionReason: String? = nil,
        counterOffer: CounterOffer? = nil
    ) {
        self.id = id
        self.candidateId = candidateId
        self.period = period
        self.candidateName = candidateName
        self.seniority = seniority
        self.role = role
        self.yourOffer = yourOffer
        self.result = result
        self.offers = offers
        self.competingPlayerIds = competingPlayerIds
        self.winningPlayerId = winningPlayerId
        self.winningOffer = winningOffer
        self.rejectionReason = rejectionReason
        self.counterOffer = counterOffer
    }
}

enum AuctionResult: Codable, Equatable {
    case accepted(playerId: String, offer: HiringOffer)
    case rejected(reason: String)
    case counterOffer(playerId: String, counter: CounterOffer)
}

// MARK: - Startup Stage

enum StartupStage: String, Codable {
    case idea = "Idea"
    case mvp = "MVP"
    case launched = "Launched"
    case growth = "Growth"
    case scaling = "Scaling"

    var attractivenessMultiplier: Double {
        switch self {
        case .idea: return 0.6
        case .mvp: return 0.75
        case .launched: return 0.9
        case .growth: return 1.1
        case .scaling: return 1.3
        }
    }
}
