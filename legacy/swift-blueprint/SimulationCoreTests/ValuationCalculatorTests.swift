import XCTest
@testable import SimulationCore

final class ValuationCalculatorTests: XCTestCase {
    func testValuationCalculation() {
        let revenue = 100_000.0
        let sector = Sector.saasB2B
        let productQuality = 1.2
        let executionVelocity = 1.0
        let teamScore = 0.5
        let year = 1

        let (valuation, breakdown) = ValuationCalculator.calculateValuation(
            revenue: revenue,
            sector: sector,
            productQuality: productQuality,
            executionVelocity: executionVelocity,
            teamScore: teamScore,
            year: year
        )

        XCTAssertGreaterThan(valuation, 0)
        XCTAssertEqual(breakdown.baseRevenue, revenue)
        XCTAssertEqual(breakdown.revenueMultiple, sector.parameters.revenueMultiple)
    }

    func testTeamScoreCalculation() {
        let team = [
            TeamMember(
                id: "1",
                name: "Test Engineer",
                role: .engineer,
                seniority: .senior,
                salaryAnnual: 150_000,
                stats: TeamStats(eng: 10, product: 5, design: 0, growth: 0, sales: 0, ops: 0, cs: 0),
                perks: [],
                riskTags: []
            )
        ]

        let score = ValuationCalculator.calculateTeamScore(team: team)
        XCTAssertGreaterThan(score, 0)
        XCTAssertLessThanOrEqual(score, 1.0)
    }

    func testExitOfferGeneration() {
        let rng = SeededRandom(seed: 12345)

        // Low valuation should not trigger exit
        let (offered1, _) = ValuationCalculator.generateExitOffer(
            valuation: 100_000,
            year: 1,
            rng: rng
        )
        XCTAssertFalse(offered1)

        // High valuation might trigger exit
        let (offered2, value2) = ValuationCalculator.generateExitOffer(
            valuation: 10_000_000,
            year: 3,
            rng: rng
        )
        if offered2 {
            XCTAssertGreaterThan(value2, 10_000_000)
        }
    }
}
