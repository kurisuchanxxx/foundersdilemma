import Foundation

// MARK: - Candidate AI Decision Engine

struct CandidateAI {

    // MARK: - Offer Evaluation

    /// Evaluates a hiring offer and returns a score (0-1)
    static func evaluateOffer(
        candidate: Candidate,
        candidateCV: CandidateCV,
        preferences: CandidatePreferences,
        offer: HiringOffer,
        startup: StartupSnapshot,
        rng: SeededRandom
    ) -> Double {
        var score: Double = 0.0

        // 1. Salary Score (weighted)
        let salaryScore = calculateSalaryScore(
            candidate: candidate,
            offer: offer,
            startup: startup
        )
        score += salaryScore * preferences.salaryWeight

        // 2. Equity Score (weighted)
        let equityScore = calculateEquityScore(
            candidate: candidate,
            offer: offer,
            startup: startup
        )
        score += equityScore * preferences.equityWeight

        // 3. Stage Score (weighted)
        let stageScore = calculateStageScore(
            seniority: candidate.seniority,
            startup: startup,
            preferences: preferences
        )
        score += stageScore * preferences.stageWeight

        // 4. Product Fit Score (weighted)
        let productFitScore = calculateProductFitScore(
            candidateCV: candidateCV,
            startup: startup,
            preferences: preferences
        )
        score += productFitScore * preferences.productFitWeight

        // 5. Reputation Score (weighted)
        let reputationScore = startup.reputation / 100.0
        score += reputationScore * preferences.reputationWeight

        // 6. Apply penalties for red flags
        let penalties = calculateRedFlagPenalties(
            startup: startup,
            preferences: preferences,
            seniority: candidate.seniority
        )
        score -= penalties

        // 7. Small random factor (±5% variance)
        let randomFactor = rng.nextDouble(min: -0.05, max: 0.05)
        score += randomFactor

        return max(0, min(1.0, score))
    }

    // MARK: - Salary Evaluation

    private static func calculateSalaryScore(
        candidate: Candidate,
        offer: HiringOffer,
        startup: StartupSnapshot
    ) -> Double {
        let expectedRange = candidate.seniority.quarterlySalaryRange
        let expectedSalary = (expectedRange.min + expectedRange.max) / 2.0

        let offeredAnnual = offer.annualSalary()
        let expectedAnnual = expectedSalary * 4

        // Score based on how much above/below expected
        let ratio = offeredAnnual / expectedAnnual

        if ratio >= 1.2 {
            return 1.0 // 20%+ above expected = perfect
        } else if ratio >= 1.0 {
            return 0.7 + (ratio - 1.0) * 1.5 // 1.0-1.2x = 0.7-1.0
        } else if ratio >= 0.8 {
            return 0.4 + (ratio - 0.8) * 1.5 // 0.8-1.0x = 0.4-0.7
        } else {
            return max(0, ratio / 0.8 * 0.4) // Below 0.8x = 0-0.4
        }
    }

    // MARK: - Equity Evaluation

    private static func calculateEquityScore(
        candidate: Candidate,
        offer: HiringOffer,
        startup: StartupSnapshot
    ) -> Double {
        let expectedRange = candidate.seniority.equityRange
        let expectedEquity = (expectedRange.min + expectedRange.max) / 2.0

        let offeredEquity = offer.equityPercentage

        // Adjust expectations based on stage
        var adjustedExpectation = expectedEquity
        switch startup.stage {
        case .ideation:
            adjustedExpectation *= 2.0 // Expect 2x equity for high risk
        case .earlyTraction:
            adjustedExpectation *= 1.5
        case .pmfSearch:
            adjustedExpectation *= 1.0
        case .scaling:
            adjustedExpectation *= 0.7
        case .growth:
            adjustedExpectation *= 0.5
        }

        let ratio = offeredEquity / adjustedExpectation

        if ratio >= 1.5 {
            return 1.0 // 50%+ above expected
        } else if ratio >= 1.0 {
            return 0.7 + (ratio - 1.0) * 0.6
        } else if ratio >= 0.7 {
            return 0.4 + (ratio - 0.7) * 1.0
        } else {
            return max(0, ratio / 0.7 * 0.4)
        }
    }

    // MARK: - Stage Evaluation

    private static func calculateStageScore(
        seniority: Seniority,
        startup: StartupSnapshot,
        preferences: CandidatePreferences
    ) -> Double {
        let baseAttractiveness = startup.stage.attractiveness

        // Senior+ candidates are more stage-selective
        switch seniority {
        case .junior:
            // Juniors less picky about stage
            return baseAttractiveness * 0.8 + 0.2
        case .mid:
            return baseAttractiveness
        case .senior:
            // Seniors prefer PMF-search or scaling stages
            if startup.stage == .pmfSearch || startup.stage == .scaling {
                return 1.0
            } else {
                return baseAttractiveness * 0.7
            }
        case .staff, .principal:
            // Staff/Principal very selective
            if startup.stage == .scaling || startup.stage == .growth {
                return 1.0
            } else if startup.stage == .pmfSearch {
                return 0.6
            } else {
                return 0.2 // Unlikely to join ideation/early
            }
        }
    }

    // MARK: - Product Fit Evaluation

    private static func calculateProductFitScore(
        candidateCV: CandidateCV,
        startup: StartupSnapshot,
        preferences: CandidatePreferences
    ) -> Double {
        var score: Double = 0.5 // Base neutral score

        // Check sector preferences
        if let sectorPref = preferences.sectorPreferences[startup.sector] {
            if sectorPref > 0.5 {
                score = 0.8 + (sectorPref - 0.5) * 0.4 // Strong preference
            } else if sectorPref < -0.5 {
                score = 0.2 - (abs(sectorPref) - 0.5) * 0.4 // Strong anti-preference
            } else {
                score = 0.5 + sectorPref * 0.3
            }
        }

        // Check if candidate has relevant experience
        let hasRelevantExperience = candidateCV.experiences.contains { experience in
            // Simple heuristic: check if sector keywords match
            let sectorLower = startup.sector.lowercased()
            let descriptionLower = experience.description.lowercased()
            return descriptionLower.contains(sectorLower) ||
                   descriptionLower.contains("saas") && sectorLower.contains("saas") ||
                   descriptionLower.contains("consumer") && sectorLower.contains("consumer") ||
                   descriptionLower.contains("ecommerce") && sectorLower.contains("commerce") ||
                   descriptionLower.contains("fintech") && sectorLower.contains("fintech") ||
                   descriptionLower.contains("ai") && sectorLower.contains("tech")
        }

        if hasRelevantExperience {
            score = min(1.0, score + 0.2)
        }

        return score
    }

    // MARK: - Red Flag Penalties

    private static func calculateRedFlagPenalties(
        startup: StartupSnapshot,
        preferences: CandidatePreferences,
        seniority: Seniority
    ) -> Double {
        var penalty: Double = 0.0

        // Runway penalty
        if startup.runway < preferences.minRunwayMonths {
            let runwayShortfall = preferences.minRunwayMonths - startup.runway
            penalty += runwayShortfall * 0.05 // -5% per month below threshold
        }

        // Morale penalty
        if startup.morale < preferences.minTeamMorale {
            let moraleShortfall = preferences.minTeamMorale - startup.morale
            penalty += moraleShortfall * 0.3 // -30% per 0.1 morale below threshold
        }

        // Founder stress penalty
        if startup.founderStress > preferences.maxAcceptableStress {
            let stressExcess = startup.founderStress - preferences.maxAcceptableStress
            penalty += stressExcess * 0.2 // -20% per 0.1 stress above threshold
        }

        // No traction penalty (for senior+)
        if seniority == .senior || seniority == .staff || seniority == .principal {
            if startup.periodsSinceLaunch > 6 && startup.customers < 100 {
                penalty += 0.3 // -30% for no traction after 18 months
            }
        }

        // Burn rate unsustainability
        if startup.burnRate > startup.cash && startup.revenue < startup.burnRate * 0.3 {
            penalty += 0.25 // -25% for unsustainable burn
        }

        return penalty
    }

    // MARK: - Acceptance Threshold

    /// Returns the minimum score a candidate needs to accept an offer
    static func acceptanceThreshold(seniority: Seniority, period: Int) -> Double {
        var baseThreshold: Double

        switch seniority {
        case .junior:
            baseThreshold = 0.50 // Juniors more willing to take risks
        case .mid:
            baseThreshold = 0.60
        case .senior:
            baseThreshold = 0.75
        case .staff:
            baseThreshold = 0.85
        case .principal:
            baseThreshold = 0.90 // Very selective
        }

        // Early periods: candidates slightly more willing (less competition)
        if period <= 2 {
            baseThreshold -= 0.05
        }

        // Late periods: candidates more selective (market matures)
        if period >= 8 {
            baseThreshold += 0.05
        }

        return max(0.3, min(0.95, baseThreshold))
    }

    // MARK: - Counter Offer Logic

    /// Determines if candidate will counter-offer instead of outright rejecting
    static func shouldCounterOffer(
        score: Double,
        threshold: Double,
        seniority: Seniority,
        rng: SeededRandom
    ) -> Bool {
        // Only counter if score is close to threshold
        let gap = threshold - score
        if gap > 0.05 && gap < 0.25 {
            // 50% chance to counter if gap is small
            return rng.nextDouble() < 0.5
        }
        return false
    }

    /// Generates a counter offer with increased salary/equity
    static func generateCounterOffer(
        candidate: Candidate,
        originalOffer: HiringOffer,
        score: Double,
        threshold: Double,
        rng: SeededRandom
    ) -> (newSalary: Double, newEquity: Double) {
        let gap = threshold - score

        // Increase salary by 10-30%
        let salaryIncrease = rng.nextDouble(min: 1.10, max: 1.30)
        let newQuarterlySalary = originalOffer.quarterlySalary * salaryIncrease
        let newSemiannualSalary = originalOffer.semiannualSalary * salaryIncrease

        // Increase equity by 20-50%
        let equityIncrease = rng.nextDouble(min: 1.20, max: 1.50)
        let newEquity = originalOffer.equityPercentage * equityIncrease

        return (newQuarterlySalary * 4, newEquity) // Return annual salary
    }

    // MARK: - Rejection Reasons

    static func generateRejectionReason(
        startup: StartupSnapshot,
        preferences: CandidatePreferences,
        seniority: Seniority,
        score: Double
    ) -> String {
        var reasons: [String] = []

        if startup.runway < preferences.minRunwayMonths {
            reasons.append("Runway too short (\(String(format: "%.1f", startup.runway)) months)")
        }

        if startup.morale < preferences.minTeamMorale {
            reasons.append("Team morale concerns")
        }

        if startup.founderStress > preferences.maxAcceptableStress {
            reasons.append("Founder burnout risk")
        }

        if seniority == .senior || seniority == .staff || seniority == .principal {
            if startup.stage == .ideation || startup.stage == .earlyTraction {
                reasons.append("Stage too early for my risk profile")
            }
            if startup.periodsSinceLaunch > 6 && startup.customers < 100 {
                reasons.append("Insufficient traction after 18+ months")
            }
        }

        if score < 0.3 {
            reasons.append("Compensation package below market expectations")
        }

        if reasons.isEmpty {
            return "The opportunity doesn't align with my current career goals"
        } else {
            return reasons.joined(separator: "; ")
        }
    }
}

// MARK: - Hidden Bonus Activation

extension CandidateAI {
    /// Checks if a candidate's hidden bonuses are activated based on startup context
    static func activateHiddenBonuses(
        candidateCV: CandidateCV,
        startup: StartupSnapshot
    ) -> [HiddenBonus] {
        var activatedBonuses: [HiddenBonus] = []

        for bonus in candidateCV.hiddenBonuses {
            let shouldActivate = shouldActivateBonus(
                bonus: bonus,
                startup: startup,
                candidateCV: candidateCV
            )

            if shouldActivate {
                activatedBonuses.append(bonus)
            }
        }

        return activatedBonuses
    }

    private static func shouldActivateBonus(
        bonus: HiddenBonus,
        startup: StartupSnapshot,
        candidateCV: CandidateCV
    ) -> Bool {
        switch bonus.trigger {
        case "ex_deepmind", "ex_openai", "ex_fair":
            // Activates for DeepTech or AI-related products
            return startup.sector.lowercased().contains("tech") ||
                   startup.sector.lowercased().contains("ai")

        case "yc_founder", "ex_founder":
            // Always activates (investor relations, network)
            return true

        case "oss_maintainer":
            // Activates if there are engineers on the team (code quality matters)
            return startup.headcount > 0

        case "crypto_veteran", "fintech_survivor":
            // Activates for fintech-related sectors
            return startup.sector.lowercased().contains("fintech") ||
                   startup.sector.lowercased().contains("saas")

        case "bytedance_scale", "consumer_scale_master":
            // Activates for consumer apps
            return startup.sector.lowercased().contains("consumer")

        case "mckinsey_ops":
            // Activates when startup needs ops efficiency
            return startup.headcount >= 10 || startup.burnRate > startup.revenue * 2

        case "churn_wizard":
            // Activates when churn is a concern (SaaS, Consumer)
            return startup.sector.lowercased().contains("saas") ||
                   startup.sector.lowercased().contains("consumer")

        case "viral_growth_master":
            // Activates for growth-stage consumer products
            return startup.sector.lowercased().contains("consumer") &&
                   startup.customers > 1000

        case "brand_master":
            // Activates for consumer products needing brand
            return startup.sector.lowercased().contains("consumer") ||
                   startup.sector.lowercased().contains("commerce")

        default:
            // Unknown triggers don't activate
            return false
        }
    }
}
