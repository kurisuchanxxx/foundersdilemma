import Foundation

// MARK: - Technical Debt Calculator

struct TechnicalDebtCalculator {

    // MARK: - Debt Accrual

    /// Calculates how much tech debt is accumulated in a period
    static func calculateDebtAccrual(
        developmentSpeed: Double, // features completed this period
        designPhilosophy: DesignPhilosophy,
        devMetrics: DevelopmentMetrics,
        teamExperience: Double // 0-1, based on team seniority
    ) -> Double {
        // Base accrual from design philosophy
        let baseAccrual = designPhilosophy.techDebtAccrualRate * developmentSpeed

        // Code review reduces debt
        let reviewReduction = devMetrics.codeReviewEnabled ? 0.5 : 1.0

        // Test coverage reduces debt
        let testReduction = max(0.3, 1.0 - devMetrics.testCoverage * 0.7)

        // Refactoring time reduces debt
        let refactoringReduction = max(0.2, 1.0 - devMetrics.refactoringTimePercent)

        // Team experience reduces debt (senior engineers write cleaner code)
        let experienceReduction = max(0.5, 1.0 - teamExperience * 0.5)

        let totalDebt = baseAccrual * reviewReduction * testReduction * refactoringReduction * experienceReduction

        return max(0.0, totalDebt)
    }

    // MARK: - Velocity Slowdown

    /// Calculates how much tech debt slows down future development
    static func calculateVelocitySlowdown(techDebt: Double) -> Double {
        // Exponential penalty
        return max(0.3, 1.0 - (techDebt * 0.7))
    }

    // MARK: - Bug Introduction

    /// Calculates bugs introduced based on development speed and quality
    static func calculateBugsIntroduced(
        featuresShipped: Int,
        designPhilosophy: DesignPhilosophy,
        devMetrics: DevelopmentMetrics,
        teamExperience: Double,
        techDebtLevel: Double
    ) -> Int {
        let baseBugs = Double(featuresShipped) * designPhilosophy.bugIntroductionRate

        // Test coverage reduces bugs
        let testReduction = 1.0 - (devMetrics.testCoverage * 0.7)

        // Code review reduces bugs
        let reviewReduction = devMetrics.codeReviewEnabled ? 0.5 : 1.0

        // Team experience reduces bugs
        let experienceReduction = 1.0 - (teamExperience * 0.4)

        // High tech debt INCREASES bug rate
        let debtMultiplier = 1.0 + (techDebtLevel * 1.5)

        let totalBugs = baseBugs * testReduction * reviewReduction * experienceReduction * debtMultiplier

        return max(0, Int(totalBugs))
    }

    // MARK: - Churn Impact

    /// Calculates how bugs affect customer churn
    static func calculateChurnImpact(
        bugCount: Int,
        customerExpectations: Double, // Based on sector (SaaS = high expectations)
        productQuality: Double // 0-1
    ) -> Double {
        let bugThreshold = customerExpectations * 10.0
        let excessBugs = Double(bugCount) - bugThreshold

        if excessBugs > 0 {
            // Each bug above threshold adds 1% churn
            let churnIncrease = excessBugs * 0.01

            // Product quality mitigates some of the churn
            let mitigationFactor = productQuality * 0.5

            return max(0.0, churnIncrease * (1.0 - mitigationFactor))
        }

        return 0.0
    }

    // MARK: - Debt Paydown

    /// Calculates how much debt can be paid down with allocated refactoring time
    static func calculateDebtPaydown(
        refactoringTimePercent: Double,
        teamEngPower: Double, // Engineering capacity
        currentDebt: Double
    ) -> Double {
        // Refactoring efficiency: 10% refactoring time = -0.05 debt
        let paydownAmount = refactoringTimePercent * teamEngPower * 0.5

        return min(currentDebt, paydownAmount)
    }

    // MARK: - Recommended Actions

    /// Suggests actions to reduce tech debt
    static func recommendActions(techDebt: TechnicalDebt, devMetrics: DevelopmentMetrics) -> [String] {
        var recommendations: [String] = []

        if techDebt.level > 0.5 {
            recommendations.append("⚠️ Critical: Allocate 20%+ time to refactoring")
        } else if techDebt.level > 0.3 {
            recommendations.append("Increase refactoring time to 10-15%")
        }

        if !devMetrics.codeReviewEnabled {
            recommendations.append("Enable code reviews to reduce future debt")
        }

        if devMetrics.testCoverage < 0.5 {
            recommendations.append("Improve test coverage to 50%+")
        }

        if devMetrics.bugBacklog > 20 {
            recommendations.append("Address bug backlog before adding new features")
        }

        if techDebt.level < 0.1 && recommendations.isEmpty {
            recommendations.append("✅ Tech debt under control - maintain current practices")
        }

        return recommendations
    }

    // MARK: - Sprint Planning Impact

    /// Calculates effective sprint capacity considering tech debt
    static func calculateEffectiveSprintCapacity(
        baseCapacity: Double, // team's raw velocity
        techDebt: Double,
        bugBacklog: Int,
        refactoringTimePercent: Double
    ) -> Double {
        // Tech debt slows down velocity
        let velocityMultiplier = calculateVelocitySlowdown(techDebt: techDebt)

        // Bug fixing takes time away from features
        let bugFixTime = min(0.3, Double(bugBacklog) * 0.01) // Cap at 30% time

        // Refactoring takes time away from features
        let refactoringTime = refactoringTimePercent

        // Available capacity for features
        let availableTime = 1.0 - bugFixTime - refactoringTime

        return baseCapacity * velocityMultiplier * availableTime
    }
}

// MARK: - PMF Calculator

struct PMFCalculator {

    // MARK: - Score Calculation

    /// Calculates Product-Market Fit score
    static func calculatePMFScore(
        customerSatisfaction: Double, // 0-1
        npsScore: Int, // -100 to 100
        usageFrequency: Double, // 0-1
        viralCoefficient: Double, // k-factor
        retentionRate: Double, // 0-1
        churnRate: Double // 0-1
    ) -> Double {
        // Satisfaction component (40%)
        let satisfactionComponent = customerSatisfaction * 40.0

        // NPS component (25%)
        let npsNormalized = Double(npsScore + 100) / 200.0
        let npsComponent = npsNormalized * 25.0

        // Usage frequency component (15%)
        let usageComponent = usageFrequency * 15.0

        // Viral coefficient component (10%)
        let viralCapped = min(viralCoefficient, 2.0) / 2.0
        let viralComponent = viralCapped * 10.0

        // Retention component (10%)
        let retentionComponent = retentionRate * 10.0

        return satisfactionComponent + npsComponent + usageComponent + viralComponent + retentionComponent
    }

    // MARK: - Customer Satisfaction

    /// Calculates customer satisfaction based on product quality and bugs
    static func calculateCustomerSatisfaction(
        productQuality: Double, // 0-1
        bugCount: Int,
        featureCompleteness: Double, // 0-1 (% of must-have features done)
        supportQuality: Double // 0-1 (based on CS team)
    ) -> Double {
        var satisfaction = productQuality * 0.4

        // Feature completeness
        satisfaction += featureCompleteness * 0.3

        // Support quality
        satisfaction += supportQuality * 0.2

        // Bug penalty
        let bugPenalty = min(0.3, Double(bugCount) * 0.01)
        satisfaction -= bugPenalty

        // User delight bonus (if quality is exceptional)
        if productQuality > 0.9 && featureCompleteness > 0.8 {
            satisfaction += 0.1
        }

        return max(0.0, min(1.0, satisfaction))
    }

    // MARK: - NPS Score

    /// Estimates NPS (Net Promoter Score)
    static func estimateNPS(
        customerSatisfaction: Double,
        viralCoefficient: Double,
        productQuality: Double
    ) -> Int {
        // NPS correlates with satisfaction but with more variance
        var nps = (customerSatisfaction - 0.5) * 200 // -100 to 100

        // Viral coefficient indicates promoters
        if viralCoefficient > 1.0 {
            nps += 20
        }

        // Product quality adds to NPS
        nps += (productQuality - 0.7) * 50

        return max(-100, min(100, Int(nps)))
    }

    // MARK: - Usage Frequency

    /// Calculates daily active users ratio
    static func calculateUsageFrequency(
        dailyActiveUsers: Int,
        totalUsers: Int,
        productQuality: Double,
        sector: String
    ) -> Double {
        guard totalUsers > 0 else { return 0.0 }

        var baseFrequency = Double(dailyActiveUsers) / Double(totalUsers)

        // Sector adjustments
        if sector.lowercased().contains("consumer") {
            // Consumer apps: expect high frequency
            baseFrequency *= 1.2
        } else if sector.lowercased().contains("saas") {
            // SaaS: moderate frequency
            baseFrequency *= 1.0
        } else if sector.lowercased().contains("commerce") {
            // Ecommerce: lower frequency but high intent
            baseFrequency *= 0.8
        }

        // Product quality drives engagement
        baseFrequency *= (0.7 + productQuality * 0.3)

        return min(1.0, baseFrequency)
    }

    // MARK: - Viral Coefficient

    /// Calculates k-factor (viral coefficient)
    static func calculateViralCoefficient(
        invitesSentPerUser: Double,
        inviteConversionRate: Double,
        customerSatisfaction: Double,
        hasReferralIncentive: Bool
    ) -> Double {
        var kFactor = invitesSentPerUser * inviteConversionRate

        // Satisfaction drives organic sharing
        kFactor *= (0.5 + customerSatisfaction * 0.5)

        // Referral incentives boost virality
        if hasReferralIncentive {
            kFactor *= 1.5
        }

        return kFactor
    }
}
