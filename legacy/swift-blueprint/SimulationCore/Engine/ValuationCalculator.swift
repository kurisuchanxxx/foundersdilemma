import Foundation

struct ValuationCalculator {
    static func calculateValuation(
        revenue: Double,
        sector: Sector,
        productQuality: Double,
        executionVelocity: Double,
        teamScore: Double,
        year: Int
    ) -> (valuation: Double, breakdown: ValuationBreakdown) {
        let revenueMultiple = sector.parameters.revenueMultiple
        let baseRevenue = max(10_000, revenue)

        let growthBonus = year > 1 ? 1.0 + (Double(year) * 0.1) : 1.0
        let teamBonus = 1.0 + (teamScore * 0.2)
        let productQualityBonus = productQuality
        let executionBonus = executionVelocity

        let totalMultiplier = revenueMultiple * growthBonus * teamBonus * productQualityBonus * executionBonus
        let valuation = baseRevenue * totalMultiplier

        let breakdown = ValuationBreakdown(
            baseRevenue: baseRevenue,
            revenueMultiple: revenueMultiple,
            growthBonus: growthBonus,
            teamBonus: teamBonus,
            productQualityBonus: productQualityBonus,
            totalValuation: valuation
        )

        return (max(0, valuation), breakdown)
    }

    static func calculateTeamScore(team: [TeamMember]) -> Double {
        guard !team.isEmpty else { return 0.0 }
        let stats = TeamSystem.calculateAggregatedStats(team: team)
        let totalStats = stats.eng + stats.product + stats.design + stats.growth + stats.sales + stats.ops + stats.cs
        return min(1.0, Double(totalStats) / 100.0)
    }

    static func generateExitOffer(
        valuation: Double,
        year: Int,
        rng: SeededRandom
    ) -> (offered: Bool, value: Double) {
        let exitThreshold = 5_000_000.0
        guard valuation > exitThreshold else { return (false, 0) }

        let exitProbability = min(0.3, Double(year) * 0.05)
        let shouldOffer = rng.nextDouble() < exitProbability

        if shouldOffer {
            let multiplier = rng.nextDouble(min: 1.2, max: 2.0)
            let exitValue = valuation * multiplier
            return (true, exitValue)
        }

        return (false, 0)
    }
}
