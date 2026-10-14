import Foundation

enum RiskLevel: String, Codable, CaseIterable {
    case low = "Low"
    case medium = "Medium"
    case high = "High"

    var eventProbabilityMultiplier: Double {
        switch self {
        case .low: return 0.5
        case .medium: return 1.0
        case .high: return 1.8
        }
    }

    var rewardMultiplier: Double {
        switch self {
        case .low: return 0.8
        case .medium: return 1.0
        case .high: return 1.4
        }
    }
}

enum GTMFocus: String, Codable, CaseIterable {
    case brand = "Brand"
    case performance = "Performance"
    case partnership = "Partnership"

    var cacMultiplier: Double {
        switch self {
        case .brand: return 1.2
        case .performance: return 0.9
        case .partnership: return 1.0
        }
    }

    var ltmMultiplier: Double {
        switch self {
        case .brand: return 1.3
        case .performance: return 1.0
        case .partnership: return 1.4
        }
    }
}

struct HiringDecision: Codable, Equatable {
    let candidateIds: [String]
    let firings: [String]
}

struct FundingRound: Codable, Equatable {
    let amount: Double
    let dilution: Double
    let year: Int
}

struct Decision: Codable, Equatable {
    var spendRnD: Double
    var spendMarketing: Double
    var spendOperations: Double
    var mvpDevelopmentMonths: Int
    var pricing: Double
    var gtmFocus: GTMFocus
    var hiring: HiringDecision
    var raiseRound: FundingRound?
    var acceptExit: Bool

    static let zero = Decision(
        spendRnD: 0,
        spendMarketing: 0,
        spendOperations: 0,
        mvpDevelopmentMonths: 6,
        pricing: 0,
        gtmFocus: .performance,
        hiring: HiringDecision(candidateIds: [], firings: []),
        raiseRound: nil,
        acceptExit: false
    )
}
