import Foundation

struct Metrics: Codable, Equatable {
    var cash: Double
    var burnRate: Double
    var runway: Double

    var mvpProgress: Double
    var mvpReady: Bool

    var cac: Double
    var ltv: Double
    var churnRate: Double
    var retentionRate: Double

    var revenue: Double
    var users: Int
    var customers: Int
    var grossMargin: Double

    var teamCost: Double
    var headcount: Int
    var executionVelocity: Double
    var morale: Double

    var valuation: Double
    var equityOwned: Double

    var exitOffered: Bool
    var exitValue: Double
    var exitAccepted: Bool
    var exitYear: Int?

    static let zero = Metrics(
        cash: 0,
        burnRate: 0,
        runway: 0,
        mvpProgress: 0,
        mvpReady: false,
        cac: 0,
        ltv: 0,
        churnRate: 0,
        retentionRate: 1.0,
        revenue: 0,
        users: 0,
        customers: 0,
        grossMargin: 0,
        teamCost: 0,
        headcount: 0,
        executionVelocity: 1.0,
        morale: 1.0,
        valuation: 0,
        equityOwned: 1.0,
        exitOffered: false,
        exitValue: 0,
        exitAccepted: false,
        exitYear: nil
    )

    mutating func updateRunway() {
        if burnRate > 0 {
            runway = cash / burnRate
        } else {
            runway = cash > 0 ? 999 : 0
        }
    }
}

struct ValuationBreakdown: Codable {
    let baseRevenue: Double
    let revenueMultiple: Double
    let growthBonus: Double
    let teamBonus: Double
    let productQualityBonus: Double
    let totalValuation: Double
}
