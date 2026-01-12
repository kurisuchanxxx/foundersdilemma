import Foundation

struct SimulationEngine {
    private let rng: SeededRandom

    init(seed: UInt64) {
        self.rng = SeededRandom(seed: seed)
    }

    func simulateRound(gameState: inout GameState) {
        let round = gameState.currentRound
        let year = gameState.currentYear

        for i in 0..<gameState.players.count {
            guard let decision = gameState.players[i].currentDecision else { continue }
            simulatePlayerRound(player: &gameState.players[i], decision: decision, round: round, year: year, rng: rng)
        }

        let globalEvent = EventGenerator.generateGlobalEvent(
            year: year,
            rng: rng,
            mvpReady: gameState.players.contains { $0.metrics.mvpReady }
        )
        if let event = globalEvent {
            gameState.events.append(event)
            applyGlobalEvent(event: event, gameState: &gameState)
        }

        for i in 0..<gameState.players.count {
            let player = gameState.players[i]
            let playerEvents = EventGenerator.generatePlayerEvents(
                playerId: player.id,
                year: year,
                riskLevel: player.riskLevel,
                mvpReady: player.metrics.mvpReady,
                rng: rng
            )
            gameState.events.append(contentsOf: playerEvents)
            for event in playerEvents {
                applyPlayerEvent(event: event, player: &gameState.players[i])
            }

            let teamEvents = EventGenerator.generateTeamEvents(
                playerId: player.id,
                year: year,
                team: player.team,
                rng: rng
            )
            gameState.events.append(contentsOf: teamEvents)
            for event in teamEvents {
                applyTeamEvent(event: event, player: &gameState.players[i])
            }
        }

        for i in 0..<gameState.players.count {
            checkExitOffer(player: &gameState.players[i], year: year, rng: rng)
        }
    }

    private func simulatePlayerRound(player: inout Player, decision: Decision, round: Int, year: Int, rng: SeededRandom) {
        applyHiringDecisions(player: &player, decision: decision)

        let founderMulti = player.founderMultipliers
        let teamCost = TeamSystem.calculateTotalTeamCost(team: player.team)
        let headcount = TeamSystem.calculateHeadcount(team: player.team)

        let rndEfficiency = TeamSystem.calculateRnDEfficiency(team: player.team, founderMultipliers: founderMulti)
        let marketingEfficiency = TeamSystem.calculateMarketingEfficiency(team: player.team, founderMultipliers: founderMulti)
        let salesEfficiency = TeamSystem.calculateSalesEfficiency(team: player.team, founderMultipliers: founderMulti)
        let productQuality = TeamSystem.calculateProductQuality(team: player.team, founderMultipliers: founderMulti)
        let csReduction = TeamSystem.calculateChurnReduction(team: player.team)

        player.metrics.mvpProgress = MetricsCalculator.calculateMVPProgress(
            currentProgress: player.metrics.mvpProgress,
            rndSpend: decision.spendRnD,
            rndEfficiency: rndEfficiency,
            developmentMonths: decision.mvpDevelopmentMonths,
            sector: player.sector
        )
        player.metrics.mvpReady = player.metrics.mvpProgress >= 1.0

        player.metrics.cac = MetricsCalculator.calculateCAC(
            sector: player.sector,
            marketingSpend: decision.spendMarketing,
            marketingEfficiency: marketingEfficiency,
            gtmFocus: decision.gtmFocus,
            year: year
        )

        player.metrics.churnRate = MetricsCalculator.calculateChurnRate(
            sector: player.sector,
            productQuality: productQuality,
            customerSuccessReduction: csReduction,
            year: year
        )

        player.metrics.ltv = MetricsCalculator.calculateLTV(
            sector: player.sector,
            pricing: decision.pricing,
            salesEfficiency: salesEfficiency,
            productQuality: productQuality,
            gtmFocus: decision.gtmFocus,
            churnRate: player.metrics.churnRate
        )

        let newCustomers = MetricsCalculator.calculateNewCustomers(
            marketingSpend: decision.spendMarketing,
            cac: player.metrics.cac,
            salesEfficiency: salesEfficiency
        )

        player.metrics.customers = max(0, Int(Double(player.metrics.customers) * (1.0 - player.metrics.churnRate)) + newCustomers)
        player.metrics.users = player.metrics.customers

        player.metrics.revenue = MetricsCalculator.calculateRevenue(
            customers: player.metrics.customers,
            pricing: decision.pricing,
            grossMargin: player.sector.parameters.baseGrossMargin
        )

        player.metrics.teamCost = teamCost
        player.metrics.headcount = headcount
        player.metrics.executionVelocity = TeamSystem.calculateExecutionVelocity(team: player.team, headcount: headcount)

        let teamScore = ValuationCalculator.calculateTeamScore(team: player.team)
        let (valuation, _) = ValuationCalculator.calculateValuation(
            revenue: player.metrics.revenue,
            sector: player.sector,
            productQuality: productQuality,
            executionVelocity: player.metrics.executionVelocity,
            teamScore: teamScore,
            year: year
        )
        player.metrics.valuation = valuation

        player.metrics.burnRate = MetricsCalculator.calculateBurnRate(
            rndSpend: decision.spendRnD,
            marketingSpend: decision.spendMarketing,
            opsSpend: decision.spendOperations,
            teamCost: teamCost
        )

        if let raise = decision.raiseRound {
            player.metrics.cash += raise.amount
            player.metrics.equityOwned *= (1.0 - raise.dilution)
        }

        player.metrics.cash += player.metrics.revenue
        player.metrics.cash -= player.metrics.burnRate

        player.metrics.updateRunway()

        let cashStress = player.metrics.runway < 6.0 ? 0.8 : 0.2
        TeamSystem.updateMorale(team: &player.team, cashStress: cashStress, rng: rng)
        player.metrics.morale = TeamSystem.calculateMorale(team: player.team)

        // Update PMF dimensions based on decisions
        updatePMFDimensions(player: &player, decision: decision, productQuality: productQuality, rng: rng)

        player.decisionsHistory.append(decision)
        player.currentDecision = nil
    }

    /// Update PMF dimensions based on product decisions with trade-offs
    private func updatePMFDimensions(player: inout Player, decision: Decision, productQuality: Double, rng: SeededRandom) {
        let currentPhase = player.pmfMetrics.currentPhase

        // Apply decision impacts to PMF dimensions
        if currentPhase == .prePMF {
            // Pre-PMF decisions
            applyDimensionImpacts(
                dimensions: &player.pmfMetrics.dimensions,
                impacts: decision.developmentSpeed.dimensionImpacts(),
                player: player,
                rng: rng
            )

            applyDimensionImpacts(
                dimensions: &player.pmfMetrics.dimensions,
                impacts: decision.mvpScope.dimensionImpacts(),
                player: player,
                rng: rng
            )

            applyDimensionImpacts(
                dimensions: &player.pmfMetrics.dimensions,
                impacts: decision.customerDiscoveryIntensity.dimensionImpacts(),
                player: player,
                rng: rng
            )
        } else {
            // Post-PMF decisions
            applyDimensionImpacts(
                dimensions: &player.pmfMetrics.dimensions,
                impacts: decision.featureExpansionStrategy.dimensionImpacts(),
                player: player,
                rng: rng
            )

            applyDimensionImpacts(
                dimensions: &player.pmfMetrics.dimensions,
                impacts: decision.qualityInvestment.dimensionImpacts(),
                player: player,
                rng: rng
            )
        }

        // Apply product quality influence on solution fit
        let qualityImpact = (productQuality - 0.7) * 0.1 // -0.07 to +0.03
        player.pmfMetrics.dimensions.solutionFit = clamp(
            player.pmfMetrics.dimensions.solutionFit + qualityImpact,
            min: 0.0,
            max: 1.0
        )

        // Apply volatility-based randomness
        applyVolatility(dimensions: &player.pmfMetrics.dimensions, rng: rng)

        // Advance period and apply delayed effects
        player.pmfMetrics.advancePeriod()

        // Recalculate PMF score from dimensions
        player.pmfMetrics.updateScore(sector: player.sector)
    }

    /// Apply dimension impacts from a decision
    private func applyDimensionImpacts(
        dimensions: inout PMFDimensions,
        impacts: [DimensionImpact],
        player: Player,
        rng: SeededRandom
    ) {
        for impact in impacts {
            let baseChange = magnitudeToValue(impact.magnitude, impact.direction)

            if impact.delayed {
                // Add to pending effects for next period
                let effect = PendingPMFEffect(
                    dimension: impact.dimension,
                    delta: baseChange,
                    appliesAtPeriod: player.pmfMetrics.currentPeriod + 1,
                    reason: "Delayed effect from \(impact.dimension.rawValue)"
                )
                dimensions.pendingEffects.append(effect)
            } else {
                // Apply immediately
                applyDimensionChange(dimensions: &dimensions, dimension: impact.dimension, delta: baseChange)
            }
        }
    }

    /// Convert impact magnitude to numeric value
    private func magnitudeToValue(_ magnitude: DimensionImpact.ImpactMagnitude, _ direction: DimensionImpact.ImpactDirection) -> Double {
        let absValue: Double
        switch magnitude {
        case .small: absValue = 0.05
        case .medium: absValue = 0.10
        case .large: absValue = 0.15
        }

        switch direction {
        case .positive: return absValue
        case .negative: return -absValue
        case .neutral: return 0.0
        }
    }

    /// Apply a dimension change with clamping
    private func applyDimensionChange(dimensions: inout PMFDimensions, dimension: PMFDimension, delta: Double) {
        switch dimension {
        case .problemClarity:
            dimensions.problemClarity = clamp(dimensions.problemClarity + delta, min: 0.0, max: 1.0)
        case .solutionFit:
            dimensions.solutionFit = clamp(dimensions.solutionFit + delta, min: 0.0, max: 1.0)
        case .marketPull:
            dimensions.marketPull = clamp(dimensions.marketPull + delta, min: 0.0, max: 1.0)
        case .learningVelocity:
            dimensions.learningVelocity = clamp(dimensions.learningVelocity + delta, min: 0.0, max: 1.0)
        case .volatility:
            dimensions.volatility = clamp(dimensions.volatility + delta, min: 0.0, max: 1.0)
        }
    }

    /// Apply volatility-based randomness to PMF dimensions
    private func applyVolatility(dimensions: inout PMFDimensions, rng: SeededRandom) {
        let volatilityFactor = dimensions.volatility

        // Higher volatility = more random swings
        let randomFactors = [
            rng.nextGaussian(mean: 0.0, stdDev: volatilityFactor * 0.05),
            rng.nextGaussian(mean: 0.0, stdDev: volatilityFactor * 0.05),
            rng.nextGaussian(mean: 0.0, stdDev: volatilityFactor * 0.05),
            rng.nextGaussian(mean: 0.0, stdDev: volatilityFactor * 0.05)
        ]

        dimensions.problemClarity = clamp(dimensions.problemClarity + randomFactors[0], min: 0.0, max: 1.0)
        dimensions.solutionFit = clamp(dimensions.solutionFit + randomFactors[1], min: 0.0, max: 1.0)
        dimensions.marketPull = clamp(dimensions.marketPull + randomFactors[2], min: 0.0, max: 1.0)
        dimensions.learningVelocity = clamp(dimensions.learningVelocity + randomFactors[3], min: 0.0, max: 1.0)
    }

    /// Clamp value between min and max
    private func clamp(_ value: Double, min: Double, max: Double) -> Double {
        return Swift.min(Swift.max(value, min), max)
    }

    private func applyHiringDecisions(player: inout Player, decision: Decision) {
        for candidateId in decision.hiring.candidateIds {
            if let candidate = player.team.first(where: { $0.id == candidateId }) {
                continue
            }
            // This would normally fetch from candidatePool, but we'll handle in ViewModel
        }

        for firingId in decision.hiring.firings {
            player.team.removeAll { $0.id == firingId }
        }
    }

    private func applyGlobalEvent(event: Event, gameState: inout GameState) {
        for i in 0..<gameState.players.count {
            applyEventEffects(event: event, player: &gameState.players[i])
        }
    }

    private func applyPlayerEvent(event: Event, player: inout Player) {
        applyEventEffects(event: event, player: &player)
    }

    private func applyTeamEvent(event: Event, player: inout Player) {
        applyEventEffects(event: event, player: &player)

        if let resignationId = event.effects.teamMemberResignation {
            player.team.removeAll { $0.id == resignationId }
        }

        if let burnoutId = event.effects.teamMemberBurnout {
            if let index = player.team.firstIndex(where: { $0.id == burnoutId }) {
                player.team[index].morale *= 0.5
            }
        }
    }

    private func applyEventEffects(event: Event, player: inout Player) {
        if let cashDelta = event.effects.cashDelta {
            player.metrics.cash += cashDelta
        }
        if let cacMultiplier = event.effects.cacMultiplier {
            player.metrics.cac *= cacMultiplier
        }
        if let ltvMultiplier = event.effects.ltvMultiplier {
            player.metrics.ltv *= ltvMultiplier
        }
        if let churnDelta = event.effects.churnDelta {
            player.metrics.churnRate = max(0.01, min(0.5, player.metrics.churnRate + churnDelta))
        }
        if let revenueDelta = event.effects.revenueDelta {
            player.metrics.revenue += revenueDelta
        }
        if let moraleMultiplier = event.effects.moraleMultiplier {
            for i in 0..<player.team.count {
                player.team[i].morale *= moraleMultiplier
                player.team[i].morale = max(0.1, min(1.0, player.team[i].morale))
            }
        }
    }

    private func checkExitOffer(player: inout Player, year: Int, rng: SeededRandom) {
        guard !player.metrics.exitAccepted else { return }

        let (offered, value) = ValuationCalculator.generateExitOffer(
            valuation: player.metrics.valuation,
            year: year,
            rng: rng
        )

        if offered {
            player.metrics.exitOffered = true
            player.metrics.exitValue = value
        }
    }
}
