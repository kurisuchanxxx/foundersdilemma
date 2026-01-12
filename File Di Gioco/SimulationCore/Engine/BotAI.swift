import Foundation

struct BotAI {
    static func generateDecision(for player: Player, year: Int) -> Decision {
        let sectorParams = player.sector.parameters
        let cash = player.metrics.cash
        let conservativeFactor = player.riskLevel == .low ? 0.6 : (player.riskLevel == .high ? 1.4 : 1.0)

        let rndBudget = min(cash * 0.3 * conservativeFactor, 100_000)
        let marketingBudget = min(cash * 0.35 * conservativeFactor, 120_000)
        let opsBudget = min(cash * 0.15, 50_000)

        let mvpMonths = player.metrics.mvpReady ? 3 : 8
        let pricing = sectorParams.baseCAC * Double.random(in: 8...15)
        let gtmFocus: GTMFocus = [.brand, .performance, .partnership].randomElement() ?? .performance

        let hiring = HiringDecision(candidateIds: [], firings: [])

        var raiseRound: FundingRound? = nil
        if year == 2 || year == 4 {
            if cash < 200_000 && Double.random(in: 0...1) > 0.5 {
                raiseRound = FundingRound(amount: 500_000, dilution: 0.20, year: year)
            }
        }

        let acceptExit = false

        return Decision(
            spendRnD: rndBudget,
            spendMarketing: marketingBudget,
            spendOperations: opsBudget,
            mvpDevelopmentMonths: mvpMonths,
            pricing: pricing,
            gtmFocus: gtmFocus,
            hiring: hiring,
            raiseRound: raiseRound,
            acceptExit: acceptExit
        )
    }
}
