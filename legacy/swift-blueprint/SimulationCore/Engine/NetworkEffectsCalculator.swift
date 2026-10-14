import Foundation

// MARK: - Network Effects Calculator

struct NetworkEffectsCalculator {

    // MARK: - Value Multiplier

    /// Calculates the value multiplier from network effects (Metcalfe's Law)
    static func calculateValueMultiplier(
        users: Int,
        strength: NetworkEffectStrength
    ) -> Double {
        guard users > 0 else { return 1.0 }

        let baseValue = 1.0

        // Metcalfe's Law variant: value ∝ n^exponent
        let networkBonus = pow(log(Double(users) + 1), strength.exponent) * 0.15

        return min(3.0, baseValue + networkBonus)
    }

    // MARK: - Viral Coefficient

    /// Calculates word-of-mouth viral coefficient (k-factor)
    static func calculateViralCoefficient(
        satisfaction: Double, // 0-1
        productType: String,
        networkEffects: NetworkEffects,
        hasReferralProgram: Bool
    ) -> Double {
        // Base k-factor varies by product type
        var baseK: Double

        if productType.lowercased().contains("consumer") {
            baseK = 0.4 // Consumer apps naturally viral
        } else if productType.lowercased().contains("saas") {
            baseK = 0.2 // B2B less viral
        } else if productType.lowercased().contains("commerce") {
            baseK = 0.25
        } else {
            baseK = 0.15 // DeepTech least viral
        }

        // Satisfaction multiplier
        baseK *= satisfaction

        // Network effects boost virality
        if networkEffects.enabled {
            baseK *= networkEffects.currentMultiplier * 0.5
        }

        // Referral program boost
        if hasReferralProgram {
            baseK *= 1.8
        }

        return baseK
    }

    // MARK: - Organic Growth

    /// Calculates organic customer acquisition from word-of-mouth
    static func calculateOrganicGrowth(
        currentUsers: Int,
        viralCoefficient: Double,
        period: Int
    ) -> Int {
        guard viralCoefficient > 0 else { return 0 }

        // Simple viral loop: new_users = existing_users * k
        let organicUsers = Double(currentUsers) * viralCoefficient

        // Early periods have lower viral effect (need critical mass)
        var earlyPeriodPenalty = 1.0
        if period <= 3 {
            earlyPeriodPenalty = 0.5
        } else if period <= 6 {
            earlyPeriodPenalty = 0.75
        }

        return Int(organicUsers * earlyPeriodPenalty)
    }

    // MARK: - LTV Boost

    /// Calculates how network effects increase LTV
    static func calculateLTVBoost(
        networkEffects: NetworkEffects,
        users: Int
    ) -> Double {
        guard networkEffects.enabled && users > 100 else { return 1.0 }

        // More users = more value = willing to pay more / stay longer
        let boost = 1.0 + (networkEffects.currentMultiplier - 1.0) * 0.3

        return boost
    }

    // MARK: - CAC Reduction

    /// Calculates how word-of-mouth reduces CAC
    static func calculateCACReduction(
        viralCoefficient: Double,
        organicPercentage: Double // % of new users from organic
    ) -> Double {
        // Organic users are free, reducing blended CAC
        let reduction = 1.0 - (organicPercentage * 0.7) // Up to -70% CAC

        return max(0.3, reduction)
    }
}

// MARK: - Exogenous Events Generator

struct ExogenousEventsGenerator {

    // MARK: - Event Library

    static let eventLibrary: [ExogenousEvent] = [
        // MACRO TRENDS
        ExogenousEvent(
            type: .macroTrend,
            name: "AI Boom",
            description: "Massive investor and consumer interest in AI products",
            probability: 0.12,
            duration: 3,
            effects: ExogenousEffects(
                cacMultiplier: 0.7,
                fundingAvailability: 2.0,
                demandShock: 1.5
            )
        ),
        ExogenousEvent(
            type: .macroTrend,
            name: "Recession Hits",
            description: "Economic downturn reduces consumer/enterprise spending",
            probability: 0.08,
            duration: 4,
            effects: ExogenousEffects(
                cacMultiplier: 1.4,
                ltvMultiplier: 0.7,
                churnDelta: 0.08,
                fundingAvailability: 0.3
            )
        ),
        ExogenousEvent(
            type: .macroTrend,
            name: "Remote Work Revolution",
            description: "Global shift to remote work creates new opportunities",
            probability: 0.10,
            duration: 2,
            effects: ExogenousEffects(
                demandShock: 1.3,
                talentPoolMultiplier: 1.5
            )
        ),

        // TECH DISRUPTIONS
        ExogenousEvent(
            type: .techDisruption,
            name: "New Platform Emerges",
            description: "Major new platform (e.g., new OS, social network) creates opportunities",
            probability: 0.06,
            duration: 2,
            effects: ExogenousEffects(
                cacMultiplier: 0.8,
                demandShock: 1.2
            )
        ),
        ExogenousEvent(
            type: .techDisruption,
            name: "API Deprecation Crisis",
            description: "Major platform deprecates APIs, requires migration work",
            probability: 0.08,
            duration: 1,
            effects: ExogenousEffects(
                churnDelta: 0.05
            )
        ),
        ExogenousEvent(
            type: .techDisruption,
            name: "Breakthrough Technology",
            description: "New technology (blockchain, VR, etc.) creates competitive threat",
            probability: 0.05,
            duration: 3,
            effects: ExogenousEffects(
                competitorIntensity: 1.5,
                cacMultiplier: 1.2
            )
        ),

        // FUNDING CLIMATE
        ExogenousEvent(
            type: .fundingClimate,
            name: "Bull Market for Startups",
            description: "Valuations soar, easy money for fundingises",
            probability: 0.12,
            duration: 4,
            effects: ExogenousEffects(
                fundingAvailability: 2.5
            )
        ),
        ExogenousEvent(
            type: .fundingClimate,
            name: "Down Round Era",
            description: "Difficult funding environment, flat/down rounds common",
            probability: 0.10,
            duration: 3,
            effects: ExogenousEffects(
                fundingAvailability: 0.4
            )
        ),

        // TALENT MARKET
        ExogenousEvent(
            type: .talentMarket,
            name: "Big Tech Layoffs Wave",
            description: "Mass layoffs at FAANG companies flood talent market",
            probability: 0.08,
            duration: 2,
            effects: ExogenousEffects(
                talentPoolMultiplier: 2.5,
                salaryPressure: 0.85
            )
        ),
        ExogenousEvent(
            type: .talentMarket,
            name: "AI Engineer Shortage",
            description: "Extreme shortage of AI/ML talent drives salaries up",
            probability: 0.15,
            duration: 3,
            effects: ExogenousEffects(
                talentPoolMultiplier: 0.5,
                salaryPressure: 1.5
            )
        ),
        ExogenousEvent(
            type: .talentMarket,
            name: "Immigration Policy Tightens",
            description: "New restrictions reduce international talent availability",
            probability: 0.06,
            duration: 4,
            effects: ExogenousEffects(
                talentPoolMultiplier: 0.7,
                salaryPressure: 1.2
            )
        ),

        // BLACK SWAN
        ExogenousEvent(
            type: .blackSwan,
            name: "Global Pandemic",
            description: "Pandemic forces remote transition, disrupts economy",
            probability: 0.01,
            duration: 6,
            effects: ExogenousEffects(
                churnDelta: 0.10,
                demandShock: 0.6,
                fundingAvailability: 0.5
            )
        ),
        ExogenousEvent(
            type: .blackSwan,
            name: "Major Competitor Acquired",
            description: "Top competitor acquired by Big Tech, market consolidation",
            probability: 0.04,
            duration: 1,
            effects: ExogenousEffects(
                competitorIntensity: 0.7,
                demandShock: 1.1
            )
        ),
        ExogenousEvent(
            type: .blackSwan,
            name: "Data Breach Industry-Wide",
            description: "Major breach affects industry, customer trust plummets",
            probability: 0.02,
            duration: 2,
            effects: ExogenousEffects(
                cacMultiplier: 1.6,
                churnDelta: 0.12
            )
        ),

        // REGULATORY
        ExogenousEvent(
            type: .regulatory,
            name: "New Privacy Regulation",
            description: "GDPR-like regulation requires compliance changes",
            probability: 0.07,
            duration: 2,
            effects: ExogenousEffects(
                churnDelta: 0.03
            )
        ),
        ExogenousEvent(
            type: .regulatory,
            name: "Tax Incentive for Tech",
            description: "Government introduces R&D tax credits",
            probability: 0.05,
            duration: 3,
            effects: ExogenousEffects(
                fundingAvailability: 1.3
            )
        )
    ]

    // MARK: - Event Generation

    /// Generates exogenous events for a given period
    static func generateEvents(
        period: Int,
        sector: String,
        rng: SeededRandom
    ) -> [ExogenousEvent] {
        var triggeredEvents: [ExogenousEvent] = []

        for event in eventLibrary {
            // Adjust probability based on sector
            var adjustedProbability = event.probability

            // Sector-specific adjustments
            if event.name.contains("AI") && sector.lowercased().contains("tech") {
                adjustedProbability *= 2.0
            }

            if event.type == .regulatory && sector.lowercased().contains("fintech") {
                adjustedProbability *= 1.5
            }

            // Early periods less likely for some events
            if period <= 2 && event.type == .blackSwan {
                adjustedProbability *= 0.5
            }

            // Roll for event
            if rng.nextDouble() < adjustedProbability {
                triggeredEvents.append(event)
            }
        }

        // Limit to 1-2 events per period max
        if triggeredEvents.count > 2 {
            triggeredEvents = Array(triggeredEvents.prefix(2))
        }

        return triggeredEvents
    }

    /// Applies exogenous event effects to game state
    static func applyEventEffects(
        event: ExogenousEvent,
        gameState: inout GameState
    ) {
        for i in 0..<gameState.players.count {
            applyEffectsToPlayer(
                event: event,
                player: &gameState.players[i]
            )
        }

        // Global effects on candidate pool
        if let talentMultiplier = event.effects.talentPoolMultiplier {
            adjustCandidatePool(
                gameState: &gameState,
                multiplier: talentMultiplier
            )
        }
    }

    private static func applyEffectsToPlayer(
        event: ExogenousEvent,
        player: inout Player
    ) {
        if let cacMultiplier = event.effects.cacMultiplier {
            player.metrics.cac *= cacMultiplier
        }

        if let ltvMultiplier = event.effects.ltvMultiplier {
            player.metrics.ltv *= ltvMultiplier
        }

        if let churnDelta = event.effects.churnDelta {
            player.metrics.churnRate = min(0.5, max(0.01, player.metrics.churnRate + churnDelta))
        }

        if let demandShock = event.effects.demandShock {
            let customerAdjustment = Int(Double(player.metrics.customers) * (demandShock - 1.0))
            player.metrics.customers = max(0, player.metrics.customers + customerAdjustment)
        }
    }

    private static func adjustCandidatePool(
        gameState: inout GameState,
        multiplier: Double
    ) {
        // If multiplier > 1: add candidates
        // If multiplier < 1: remove candidates
        let currentCount = gameState.candidatePool.count
        let targetCount = Int(Double(currentCount) * multiplier)

        if targetCount > currentCount {
            // Would add new candidates here via CandidateGenerator
            // gameState.candidatePool.append(contentsOf: newCandidates)
        } else if targetCount < currentCount {
            let toRemove = currentCount - targetCount
            gameState.candidatePool.removeLast(min(toRemove, currentCount))
        }
    }
}
