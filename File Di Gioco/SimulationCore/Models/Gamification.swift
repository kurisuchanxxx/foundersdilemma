import Foundation

// MARK: - Achievements

enum Achievement: String, Codable, CaseIterable, Identifiable {
    case firstToPMF = "first_to_pmf"
    case survivedCashCrunch = "survived_cash_crunch"
    case successfulPivot = "successful_pivot"
    case unicornStatus = "unicorn_status"
    case zeroChurn = "zero_churn_quarter"
    case hiringStreak = "hiring_streak"
    case techDebtZero = "tech_debt_zero"
    case profitabilityKing = "profitability_king"
    case rocketship = "rocketship_growth"
    case bootstrapped = "bootstrapped_to_profit"
    case acquisitionMaster = "acquisition_master"
    case retentionWizard = "retention_wizard"
    case speedDemon = "speed_demon"

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .firstToPMF: return "First to PMF"
        case .survivedCashCrunch: return "Survived Cash Crunch"
        case .successfulPivot: return "Successfully Pivoted"
        case .unicornStatus: return "Unicorn"
        case .zeroChurn: return "Zero Churn Quarter"
        case .hiringStreak: return "Hired 5 A-Players"
        case .techDebtZero: return "Zero Technical Debt"
        case .profitabilityKing: return "Profitability King"
        case .rocketship: return "Rocketship Growth"
        case .bootstrapped: return "Bootstrapped to Profit"
        case .acquisitionMaster: return "CAC Master"
        case .retentionWizard: return "Retention Wizard"
        case .speedDemon: return "Speed Demon"
        }
    }

    var description: String {
        switch self {
        case .firstToPMF: return "First player to reach Product-Market Fit"
        case .survivedCashCrunch: return "Survived with runway < 2 months"
        case .successfulPivot: return "Changed product direction and succeeded"
        case .unicornStatus: return "Reached $1B valuation"
        case .zeroChurn: return "Achieved 0% churn in a quarter"
        case .hiringStreak: return "Hired 5+ senior employees"
        case .techDebtZero: return "Maintained tech debt below 10%"
        case .profitabilityKing: return "First to profitability (revenue > burn)"
        case .rocketship: return "3x revenue growth in one period"
        case .bootstrapped: return "Reached profitability without raising funding"
        case .acquisitionMaster: return "Reduced CAC by 50%+"
        case .retentionWizard: return "Maintained 95%+ retention for 3 periods"
        case .speedDemon: return "Shipped 10+ features in one period"
        }
    }

    var iconName: String {
        switch self {
        case .firstToPMF: return "target"
        case .survivedCashCrunch: return "flame.fill"
        case .successfulPivot: return "arrow.triangle.2.circlepath"
        case .unicornStatus: return "sparkles"
        case .zeroChurn: return "heart.fill"
        case .hiringStreak: return "person.3.fill"
        case .techDebtZero: return "checkmark.seal.fill"
        case .profitabilityKing: return "dollarsign.circle.fill"
        case .rocketship: return "rocket.fill"
        case .bootstrapped: return "hammer.fill"
        case .acquisitionMaster: return "chart.line.downtrend.xyaxis"
        case .retentionWizard: return "lock.fill"
        case .speedDemon: return "bolt.fill"
        }
    }

    var reward: AchievementReward {
        switch self {
        case .firstToPMF:
            return AchievementReward(reputationBoost: 20, moraleBoost: 0.1)
        case .survivedCashCrunch:
            return AchievementReward(reputationBoost: 10, moraleBoost: 0.15)
        case .successfulPivot:
            return AchievementReward(reputationBoost: 15, cashBonus: 50_000)
        case .unicornStatus:
            return AchievementReward(reputationBoost: 50, moraleBoost: 0.2)
        case .zeroChurn:
            return AchievementReward(reputationBoost: 10, ltvBoost: 0.1)
        case .hiringStreak:
            return AchievementReward(reputationBoost: 15, moraleBoost: 0.1)
        case .techDebtZero:
            return AchievementReward(velocityBoost: 0.1)
        case .profitabilityKing:
            return AchievementReward(reputationBoost: 25, cashBonus: 100_000)
        case .rocketship:
            return AchievementReward(reputationBoost: 20, valuationBoost: 0.2)
        case .bootstrapped:
            return AchievementReward(reputationBoost: 30, moraleBoost: 0.15)
        case .acquisitionMaster:
            return AchievementReward(cacReduction: 0.1)
        case .retentionWizard:
            return AchievementReward(ltvBoost: 0.15)
        case .speedDemon:
            return AchievementReward(velocityBoost: 0.15)
        }
    }
}

struct AchievementReward: Codable, Equatable {
    var reputationBoost: Double?
    var moraleBoost: Double?
    var cashBonus: Double?
    var velocityBoost: Double?
    var cacReduction: Double?
    var ltvBoost: Double?
    var valuationBoost: Double?

    init(
        reputationBoost: Double? = nil,
        moraleBoost: Double? = nil,
        cashBonus: Double? = nil,
        velocityBoost: Double? = nil,
        cacReduction: Double? = nil,
        ltvBoost: Double? = nil,
        valuationBoost: Double? = nil
    ) {
        self.reputationBoost = reputationBoost
        self.moraleBoost = moraleBoost
        self.cashBonus = cashBonus
        self.velocityBoost = velocityBoost
        self.cacReduction = cacReduction
        self.ltvBoost = ltvBoost
        self.valuationBoost = valuationBoost
    }
}

struct PlayerAchievement: Codable, Equatable, Identifiable {
    let id: String
    let achievement: Achievement
    let unlockedPeriod: Int
    var rewardApplied: Bool

    init(
        id: String = UUID().uuidString,
        achievement: Achievement,
        unlockedPeriod: Int,
        rewardApplied: Bool = false
    ) {
        self.id = id
        self.achievement = achievement
        self.unlockedPeriod = unlockedPeriod
        self.rewardApplied = rewardApplied
    }
}

// MARK: - Founder Stress & Burnout

struct FounderMetrics: Codable, Equatable {
    var stress: Double // 0-1
    var burnoutRisk: Double // 0-1
    var workingHoursPerWeek: Int
    var lastVacationPeriod: Int?

    init(
        stress: Double = 0.3,
        burnoutRisk: Double = 0.1,
        workingHoursPerWeek: Int = 50,
        lastVacationPeriod: Int? = nil
    ) {
        self.stress = stress
        self.burnoutRisk = burnoutRisk
        self.workingHoursPerWeek = workingHoursPerWeek
        self.lastVacationPeriod = lastVacationPeriod
    }

    mutating func updateStress(
        runway: Double,
        teamMorale: Double,
        pmfAchieved: Bool,
        periodsSinceLaunch: Int,
        competitorPressure: Double
    ) {
        var newStress = 0.0

        // Runway stress
        if runway < 3 {
            newStress += 0.4
        } else if runway < 6 {
            newStress += 0.2
        } else if runway < 12 {
            newStress += 0.1
        }

        // Team morale stress
        if teamMorale < 0.5 {
            newStress += 0.3
        } else if teamMorale < 0.7 {
            newStress += 0.1
        }

        // Working hours stress
        if workingHoursPerWeek > 80 {
            newStress += 0.4
        } else if workingHoursPerWeek > 60 {
            newStress += 0.2
        } else if workingHoursPerWeek > 50 {
            newStress += 0.1
        }

        // PMF stress (if not achieved after significant time)
        if !pmfAchieved && periodsSinceLaunch > 6 {
            newStress += 0.3
        }

        // Competitor pressure
        newStress += competitorPressure * 0.2

        // Vacation relief
        if let lastVacation = lastVacationPeriod, periodsSinceLaunch - lastVacation < 4 {
            newStress *= 0.7
        }

        stress = min(1.0, newStress)
        updateBurnoutRisk()
    }

    mutating func updateBurnoutRisk() {
        // Burnout risk increases with sustained high stress
        if stress > 0.85 {
            burnoutRisk = min(1.0, burnoutRisk + 0.15)
        } else if stress > 0.7 {
            burnoutRisk = min(1.0, burnoutRisk + 0.05)
        } else if stress < 0.4 {
            burnoutRisk = max(0.0, burnoutRisk - 0.1)
        }
    }

    var decisionQualityPenalty: Double {
        // High stress reduces decision quality
        if stress > 0.9 {
            return 0.7 // -30% decision quality
        } else if stress > 0.7 {
            return 0.8 // -20%
        } else if stress > 0.5 {
            return 0.9 // -10%
        } else {
            return 1.0
        }
    }

    var stressLevel: StressLevel {
        if stress < 0.3 {
            return .low
        } else if stress < 0.6 {
            return .moderate
        } else if stress < 0.85 {
            return .high
        } else {
            return .critical
        }
    }
}

enum StressLevel: String, Codable {
    case low = "Low"
    case moderate = "Moderate"
    case high = "High"
    case critical = "Critical"

    var color: String {
        switch self {
        case .low: return "green"
        case .moderate: return "yellow"
        case .high: return "orange"
        case .critical: return "red"
        }
    }

    var iconName: String {
        switch self {
        case .low: return "face.smiling"
        case .moderate: return "face.dashed"
        case .high: return "exclamationmark.triangle"
        case .critical: return "flame.fill"
        }
    }
}

// MARK: - Reputation System

struct Reputation: Codable, Equatable {
    var investorScore: Double // 0-100
    var mediaScore: Double // 0-100
    var talentScore: Double // 0-100
    var customerScore: Double // 0-100
    var overallScore: Double // 0-100

    var pressMentions: [PressMention]
    var investorEndorsements: [InvestorEndorsement]

    init(
        investorScore: Double = 30.0,
        mediaScore: Double = 20.0,
        talentScore: Double = 40.0,
        customerScore: Double = 35.0,
        overallScore: Double = 30.0,
        pressMentions: [PressMention] = [],
        investorEndorsements: [InvestorEndorsement] = []
    ) {
        self.investorScore = investorScore
        self.mediaScore = mediaScore
        self.talentScore = talentScore
        self.customerScore = customerScore
        self.overallScore = overallScore
        self.pressMentions = pressMentions
        self.investorEndorsements = investorEndorsements
    }

    mutating func updateOverallScore() {
        overallScore = (investorScore * 0.25) + (mediaScore * 0.25) + (talentScore * 0.25) + (customerScore * 0.25)
    }

    mutating func addPressMention(_ mention: PressMention) {
        pressMentions.append(mention)

        // Update media score based on reputation impact
        let impact = Double(mention.reputationImpact)
        mediaScore = min(100, mediaScore + impact)
        updateOverallScore()
    }

    mutating func addInvestorEndorsement(_ endorsement: InvestorEndorsement) {
        investorEndorsements.append(endorsement)

        investorScore = min(100, investorScore + endorsement.impact)
        updateOverallScore()
    }

    var effects: ReputationEffects {
        ReputationEffects(
            cacReduction: (mediaScore / 100) * 0.15,      // Up to -15% CAC
            hiringBoost: (talentScore / 100) * 0.30,      // Up to +30% hiring success
            fundraisingBoost: (investorScore / 100) * 0.50 // Up to +50% fundraising
        )
    }
}

enum PressMentionType: String, Codable {
    case funding = "Funding"
    case product = "Product Launch"
    case milestone = "Milestone"
    case crisis = "Crisis"
    case acquisition = "Acquisition"
}

struct PressMention: Codable, Equatable, Identifiable {
    let id: String
    let outlet: String
    let headline: String
    let excerpt: String?
    let type: PressMentionType
    let sentiment: Sentiment
    let period: Int
    let reputationImpact: Int

    init(
        id: String = UUID().uuidString,
        outlet: String,
        headline: String,
        excerpt: String? = nil,
        type: PressMentionType,
        sentiment: Sentiment,
        period: Int,
        reputationImpact: Int
    ) {
        self.id = id
        self.outlet = outlet
        self.headline = headline
        self.excerpt = excerpt
        self.type = type
        self.sentiment = sentiment
        self.period = period
        self.reputationImpact = reputationImpact
    }
}

enum MediaOutlet: String, Codable {
    case techCrunch = "TechCrunch"
    case theVerge = "The Verge"
    case wsj = "Wall Street Journal"
    case bloomberg = "Bloomberg"
    case localNews = "Local News"

    var tier: MediaTier {
        switch self {
        case .wsj, .bloomberg: return .tier1
        case .techCrunch, .theVerge: return .tier2
        case .localNews: return .tier3
        }
    }
}

enum MediaTier {
    case tier1, tier2, tier3

    var impact: Double {
        switch self {
        case .tier1: return 15.0
        case .tier2: return 8.0
        case .tier3: return 3.0
        }
    }
}

enum Sentiment: String, Codable {
    case positive = "Positive"
    case neutral = "Neutral"
    case negative = "Negative"

    var multiplier: Double {
        switch self {
        case .positive: return 1.0
        case .neutral: return 0.5
        case .negative: return -0.8
        }
    }
}

struct InvestorEndorsement: Codable, Equatable, Identifiable {
    let id: String
    let investorName: String
    let tier: InvestorTier
    let publicQuote: String?
    let period: Int
    let reputationBoost: Int

    init(
        id: String = UUID().uuidString,
        investorName: String,
        tier: InvestorTier,
        publicQuote: String? = nil,
        period: Int,
        reputationBoost: Int
    ) {
        self.id = id
        self.investorName = investorName
        self.tier = tier
        self.publicQuote = publicQuote
        self.period = period
        self.reputationBoost = reputationBoost
    }

    var impact: Double {
        return Double(reputationBoost)
    }
}

enum InvestorTier: String, Codable {
    case angel = "Angel"
    case seed = "Seed"
    case seriesA = "Series A"
    case seriesB = "Series B"
}

struct ReputationEffects: Codable, Equatable {
    let cacReduction: Double
    let hiringBoost: Double
    let fundraisingBoost: Double
}
