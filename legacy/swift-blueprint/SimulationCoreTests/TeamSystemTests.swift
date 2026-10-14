import XCTest
@testable import SimulationCore

final class TeamSystemTests: XCTestCase {
    func testTeamCostCalculation() {
        let team = [
            TeamMember(
                id: "1",
                name: "Engineer",
                role: .engineer,
                seniority: .senior,
                salaryAnnual: 150_000,
                stats: TeamStats.zero,
                perks: [],
                riskTags: []
            ),
            TeamMember(
                id: "2",
                name: "Designer",
                role: .designer,
                seniority: .mid,
                salaryAnnual: 90_000,
                stats: TeamStats.zero,
                perks: [],
                riskTags: []
            )
        ]

        let totalCost = TeamSystem.calculateTotalTeamCost(team: team)
        XCTAssertEqual(totalCost, 240_000.0)
    }

    func testHeadcountCalculation() {
        let team = [
            TeamMember(id: "1", name: "A", role: .engineer, seniority: .mid, salaryAnnual: 100_000, stats: TeamStats.zero, perks: [], riskTags: []),
            TeamMember(id: "2", name: "B", role: .product, seniority: .senior, salaryAnnual: 120_000, stats: TeamStats.zero, perks: [], riskTags: [])
        ]

        let headcount = TeamSystem.calculateHeadcount(team: team)
        XCTAssertEqual(headcount, 2)
    }

    func testAggregatedStats() {
        let team = [
            TeamMember(
                id: "1",
                name: "Engineer",
                role: .engineer,
                seniority: .senior,
                salaryAnnual: 150_000,
                stats: TeamStats(eng: 10, product: 5, design: 0, growth: 0, sales: 0, ops: 0, cs: 0),
                perks: [],
                riskTags: []
            ),
            TeamMember(
                id: "2",
                name: "Product",
                role: .product,
                seniority: .mid,
                salaryAnnual: 100_000,
                stats: TeamStats(eng: 0, product: 8, design: 5, growth: 0, sales: 0, ops: 0, cs: 0),
                perks: [],
                riskTags: []
            )
        ]

        let stats = TeamSystem.calculateAggregatedStats(team: team)
        XCTAssertEqual(stats.eng, 10)
        XCTAssertEqual(stats.product, 13)
        XCTAssertEqual(stats.design, 5)
    }

    func testMoraleCalculation() {
        let team = [
            TeamMember(id: "1", name: "A", role: .engineer, seniority: .mid, salaryAnnual: 100_000, stats: TeamStats.zero, perks: [], riskTags: [], morale: 0.8, tenureYears: 1),
            TeamMember(id: "2", name: "B", role: .product, seniority: .senior, salaryAnnual: 120_000, stats: TeamStats.zero, perks: [], riskTags: [], morale: 1.0, tenureYears: 2)
        ]

        let morale = TeamSystem.calculateMorale(team: team)
        XCTAssertEqual(morale, 0.9)
    }

    func testRnDEfficiency() {
        let team = [
            TeamMember(
                id: "1",
                name: "Engineer",
                role: .engineer,
                seniority: .senior,
                salaryAnnual: 150_000,
                stats: TeamStats(eng: 10, product: 5, design: 0, growth: 0, sales: 0, ops: 0, cs: 0),
                perks: [],
                riskTags: [],
                morale: 1.0,
                tenureYears: 0
            )
        ]

        let founderMultipliers = FounderProfile.hacker.multipliers
        let efficiency = TeamSystem.calculateRnDEfficiency(team: team, founderMultipliers: founderMultipliers)

        XCTAssertGreaterThan(efficiency, 0)
    }

    func testExecutionVelocity() {
        let team = [
            TeamMember(id: "1", name: "A", role: .engineer, seniority: .mid, salaryAnnual: 100_000, stats: TeamStats.zero, perks: [], riskTags: [], morale: 1.0, tenureYears: 0)
        ]

        let velocity = TeamSystem.calculateExecutionVelocity(team: team, headcount: 1)
        XCTAssertGreaterThan(velocity, 0)
        XCTAssertLessThanOrEqual(velocity, 1.0)
    }
}
