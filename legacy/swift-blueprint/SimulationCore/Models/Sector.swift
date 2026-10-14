import Foundation

enum Sector: String, Codable, CaseIterable {
    case saasB2B = "SaaS B2B"
    case consumerApp = "Consumer App"
    case ecommerceD2C = "E-commerce D2C"
    case deepTech = "DeepTech"

    struct Parameters: Codable {
        let initialBudget: Double
        let baseCAC: Double
        let baseLTV: Double
        let baseChurnRate: Double
        let baseGrossMargin: Double
        let developmentTimeMultiplier: Double
        let revenueMultiple: Double
    }

    var parameters: Parameters {
        switch self {
        case .saasB2B:
            return Parameters(
                initialBudget: 35_000, // Realistic: personal savings + friends & family
                baseCAC: 1_200,
                baseLTV: 15_000,
                baseChurnRate: 0.05,
                baseGrossMargin: 0.85,
                developmentTimeMultiplier: 1.0,
                revenueMultiple: 8.0
            )
        case .consumerApp:
            return Parameters(
                initialBudget: 25_000, // Bootstrapped, lean startup
                baseCAC: 5,
                baseLTV: 25,
                baseChurnRate: 0.15,
                baseGrossMargin: 0.95,
                developmentTimeMultiplier: 0.8,
                revenueMultiple: 5.0
            )
        case .ecommerceD2C:
            return Parameters(
                initialBudget: 40_000, // Need inventory capital
                baseCAC: 35,
                baseLTV: 180,
                baseChurnRate: 0.25,
                baseGrossMargin: 0.45,
                developmentTimeMultiplier: 0.9,
                revenueMultiple: 3.0
            )
        case .deepTech:
            return Parameters(
                initialBudget: 50_000, // Grant money + savings
                baseCAC: 5_000,
                baseLTV: 100_000,
                baseChurnRate: 0.03,
                baseGrossMargin: 0.75,
                developmentTimeMultiplier: 1.5,
                revenueMultiple: 12.0
            )
        }
    }

    var description: String {
        switch self {
        case .saasB2B:
            return "Enterprise software with recurring revenue"
        case .consumerApp:
            return "Mobile/web app for consumers, ad or subscription based"
        case .ecommerceD2C:
            return "Direct-to-consumer product sales"
        case .deepTech:
            return "Hardware/AI/biotech with long development cycles"
        }
    }
}
