import Foundation

enum FounderProfile: String, Codable, CaseIterable {
    case hacker = "Hacker"
    case hustler = "Hustler"
    case designer = "Designer"
    case analyst = "Analyst"
    case visionary = "Visionary"
    case operator = "Operator"

    struct Multipliers: Codable {
        let rndEfficiency: Double
        let marketingEfficiency: Double
        let salesEfficiency: Double
        let operationsEfficiency: Double
        let productQuality: Double
        let fundraisingBonus: Double
    }

    var multipliers: Multipliers {
        switch self {
        case .hacker:
            return Multipliers(
                rndEfficiency: 1.5,
                marketingEfficiency: 0.8,
                salesEfficiency: 0.7,
                operationsEfficiency: 0.9,
                productQuality: 1.4,
                fundraisingBonus: 1.0
            )
        case .hustler:
            return Multipliers(
                rndEfficiency: 0.9,
                marketingEfficiency: 1.4,
                salesEfficiency: 1.5,
                operationsEfficiency: 1.0,
                productQuality: 0.9,
                fundraisingBonus: 1.3
            )
        case .designer:
            return Multipliers(
                rndEfficiency: 1.1,
                marketingEfficiency: 1.3,
                salesEfficiency: 0.9,
                operationsEfficiency: 0.8,
                productQuality: 1.5,
                fundraisingBonus: 1.1
            )
        case .analyst:
            return Multipliers(
                rndEfficiency: 1.0,
                marketingEfficiency: 1.2,
                salesEfficiency: 1.0,
                operationsEfficiency: 1.3,
                productQuality: 1.0,
                fundraisingBonus: 1.0
            )
        case .visionary:
            return Multipliers(
                rndEfficiency: 1.2,
                marketingEfficiency: 1.1,
                salesEfficiency: 1.0,
                operationsEfficiency: 0.7,
                productQuality: 1.3,
                fundraisingBonus: 1.5
            )
        case .operator:
            return Multipliers(
                rndEfficiency: 1.0,
                marketingEfficiency: 1.0,
                salesEfficiency: 1.2,
                operationsEfficiency: 1.5,
                productQuality: 1.0,
                fundraisingBonus: 0.9
            )
        }
    }

    var description: String {
        switch self {
        case .hacker:
            return "Tech-first builder, strong in R&D and product"
        case .hustler:
            return "Sales-driven, excels at GTM and closing deals"
        case .designer:
            return "User-centric, creates polished and delightful products"
        case .analyst:
            return "Data-driven, optimizes operations and metrics"
        case .visionary:
            return "Big-picture thinker, great at fundraising and inspiring teams"
        case .operator:
            return "Execution-focused, scales teams and processes efficiently"
        }
    }

    var iconName: String {
        switch self {
        case .hacker: return "terminal.fill"
        case .hustler: return "megaphone.fill"
        case .designer: return "paintbrush.fill"
        case .analyst: return "chart.bar.fill"
        case .visionary: return "lightbulb.fill"
        case .operator: return "gearshape.2.fill"
        }
    }
}
