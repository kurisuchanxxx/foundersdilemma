import Foundation

// MARK: - Product Canvas

struct ProductCanvas: Codable, Equatable {
    var valueProposition: String
    var features: [Feature]
    var techStack: TechStack
    var designPhilosophy: DesignPhilosophy

    init(
        valueProposition: String = "Solving a problem for customers",
        features: [Feature] = [],
        techStack: TechStack = TechStack(),
        designPhilosophy: DesignPhilosophy = .balanced
    ) {
        self.valueProposition = valueProposition
        self.features = features
        self.techStack = techStack
        self.designPhilosophy = designPhilosophy
    }

    var completedFeatures: [Feature] {
        features.filter { $0.status == .done }
    }

    var inProgressFeatures: [Feature] {
        features.filter { $0.status == .inProgress }
    }

    var backlogFeatures: [Feature] {
        features.filter { $0.status == .backlog }
    }

    var totalTechDebt: Double {
        features.reduce(0.0) { $0 + $1.techDebtAccrued } + techStack.techDebtLevel
    }
}

// MARK: - Feature

struct Feature: Codable, Equatable, Identifiable {
    let id: String
    var name: String
    var priority: FeaturePriority
    var impact: Int // 1-10 (customer value)
    var effort: Int // 1-10 (development cost)
    var status: FeatureStatus
    var techDebtAccrued: Double // 0-1
    var completionPeriod: Int?

    init(
        id: String = UUID().uuidString,
        name: String,
        priority: FeaturePriority,
        impact: Int,
        effort: Int,
        status: FeatureStatus = .backlog,
        techDebtAccrued: Double = 0.0,
        completionPeriod: Int? = nil
    ) {
        self.id = id
        self.name = name
        self.priority = priority
        self.impact = impact
        self.effort = effort
        self.status = status
        self.techDebtAccrued = techDebtAccrued
        self.completionPeriod = completionPeriod
    }

    var impactEffortRatio: Double {
        guard effort > 0 else { return 0 }
        return Double(impact) / Double(effort)
    }

    var priorityScore: Double {
        let baseScore = impactEffortRatio
        let priorityMultiplier: Double = switch priority {
        case .mustHave: 3.0
        case .shouldHave: 2.0
        case .niceToHave: 1.0
        }
        return baseScore * priorityMultiplier
    }
}

enum FeaturePriority: String, Codable, CaseIterable {
    case mustHave = "Must-Have"
    case shouldHave = "Should-Have"
    case niceToHave = "Nice-to-Have"

    var displayColor: String {
        switch self {
        case .mustHave: return "red"
        case .shouldHave: return "orange"
        case .niceToHave: return "blue"
        }
    }
}

enum FeatureStatus: String, Codable, CaseIterable {
    case backlog = "Backlog"
    case inProgress = "In Progress"
    case done = "Done"

    var iconName: String {
        switch self {
        case .backlog: return "tray.fill"
        case .inProgress: return "hammer.fill"
        case .done: return "checkmark.circle.fill"
        }
    }
}

// MARK: - Tech Stack

struct TechStack: Codable, Equatable {
    var backend: [String]
    var frontend: [String]
    var infrastructure: [String]
    var techDebtLevel: Double // 0-1

    init(
        backend: [String] = [],
        frontend: [String] = [],
        infrastructure: [String] = [],
        techDebtLevel: Double = 0.0
    ) {
        self.backend = backend
        self.frontend = frontend
        self.infrastructure = infrastructure
        self.techDebtLevel = techDebtLevel
    }

    var allTechnologies: [String] {
        backend + frontend + infrastructure
    }

    mutating func addTechDebt(_ amount: Double) {
        techDebtLevel = min(1.0, techDebtLevel + amount)
    }

    mutating func reduceTechDebt(_ amount: Double) {
        techDebtLevel = max(0.0, techDebtLevel - amount)
    }
}

enum DesignPhilosophy: String, Codable, CaseIterable {
    case movefast = "Move Fast"       // High speed, high debt
    case balanced = "Balanced"        // Normal speed, normal debt
    case quality = "Quality First"    // Slow speed, low debt

    var developmentSpeedMultiplier: Double {
        switch self {
        case .movefast: return 1.5
        case .balanced: return 1.0
        case .quality: return 0.7
        }
    }

    var techDebtAccrualRate: Double {
        switch self {
        case .movefast: return 0.15  // +15% debt per feature
        case .balanced: return 0.08  // +8% debt per feature
        case .quality: return 0.03   // +3% debt per feature
        }
    }

    var bugIntroductionRate: Double {
        switch self {
        case .movefast: return 2.5   // 2.5 bugs per feature
        case .balanced: return 1.5
        case .quality: return 0.5
        }
    }
}

// MARK: - PMF (Product-Market Fit)

struct PMFMetrics: Codable, Equatable {
    var score: Double // 0-100
    var milestones: [PMFMilestone]
    var customerSatisfaction: Double // 0-1
    var npsScore: Int // -100 to 100
    var usageFrequency: Double // 0-1 (daily active / total users)
    var viralCoefficient: Double // k-factor

    init(
        score: Double = 0.0,
        milestones: [PMFMilestone] = PMFMilestone.defaultMilestones(),
        customerSatisfaction: Double = 0.5,
        npsScore: Int = 0,
        usageFrequency: Double = 0.3,
        viralCoefficient: Double = 0.0
    ) {
        self.score = score
        self.milestones = milestones
        self.customerSatisfaction = customerSatisfaction
        self.npsScore = npsScore
        self.usageFrequency = usageFrequency
        self.viralCoefficient = viralCoefficient
    }

    var pmfAchieved: Bool {
        score >= 70.0
    }

    var currentStage: PMFStage {
        if score < 20 {
            return .searching
        } else if score < 40 {
            return .earlySignals
        } else if score < 70 {
            return .promising
        } else if score < 85 {
            return .achieved
        } else {
            return .strong
        }
    }

    mutating func updateScore() {
        // PMF formula: weighted average of key metrics
        let satisfactionComponent = customerSatisfaction * 40.0
        let npsComponent = Double(npsScore + 100) / 200.0 * 30.0 // Normalize -100/100 to 0-30
        let usageComponent = usageFrequency * 20.0
        let viralComponent = min(viralCoefficient, 2.0) / 2.0 * 10.0 // Cap at k=2.0

        score = satisfactionComponent + npsComponent + usageComponent + viralComponent
    }
}

struct PMFMilestone: Codable, Equatable, Identifiable {
    let id: String
    let threshold: Double
    let name: String
    let achievedInPeriod: Int
    let impact: String?

    init(
        id: String = UUID().uuidString,
        threshold: Double,
        name: String,
        achievedInPeriod: Int,
        impact: String? = nil
    ) {
        self.id = id
        self.threshold = threshold
        self.name = name
        self.achievedInPeriod = achievedInPeriod
        self.impact = impact
    }

    static func defaultMilestones() -> [PMFMilestone] {
        // Return empty array - milestones will be added as they are achieved
        return []
    }
}

enum PMFStage: String, Codable {
    case searching = "Searching"
    case earlySignals = "Early Signals"
    case promising = "Promising"
    case achieved = "PMF Achieved"
    case strong = "Strong PMF"

    var color: String {
        switch self {
        case .searching: return "gray"
        case .earlySignals: return "yellow"
        case .promising: return "orange"
        case .achieved: return "green"
        case .strong: return "blue"
        }
    }

    var iconName: String {
        switch self {
        case .searching: return "magnifyingglass"
        case .earlySignals: return "chart.line.uptrend.xyaxis"
        case .promising: return "flame"
        case .achieved: return "target"
        case .strong: return "star.fill"
        }
    }
}

// MARK: - Technical Debt

struct TechnicalDebt: Codable, Equatable {
    var level: Double // 0-1 (0 = zero debt, 1 = crippling)
    var sources: [TechnicalDebtSource]
    var velocityImpact: Double // How much it slows down development

    init(
        level: Double = 0.0,
        sources: [TechnicalDebtSource] = [],
        velocityImpact: Double = 1.0
    ) {
        self.level = level
        self.sources = sources
        self.velocityImpact = velocityImpact
    }

    mutating func accrue(_ amount: Double, source: TechnicalDebtSource) {
        level = min(1.0, level + amount)
        sources.append(source)
        updateVelocityImpact()
    }

    mutating func payDown(_ amount: Double) {
        level = max(0.0, level - amount)
        updateVelocityImpact()
    }

    mutating func updateVelocityImpact() {
        // Velocity impact formula: exponential penalty
        // 0 debt = 1.0x speed
        // 0.3 debt = 0.85x speed
        // 0.5 debt = 0.7x speed
        // 0.8 debt = 0.4x speed
        // 1.0 debt = 0.3x speed
        velocityImpact = max(0.3, 1.0 - (level * 0.7))
    }

    var severity: DebtSeverity {
        if level < 0.2 {
            return .low
        } else if level < 0.4 {
            return .medium
        } else if level < 0.7 {
            return .high
        } else {
            return .critical
        }
    }
}

struct TechnicalDebtSource: Codable, Equatable, Identifiable {
    let id: String
    let description: String
    let severity: Double // 0-1
    let affectedArea: String?

    init(
        id: String = UUID().uuidString,
        description: String,
        severity: Double,
        affectedArea: String? = nil
    ) {
        self.id = id
        self.description = description
        self.severity = severity
        self.affectedArea = affectedArea
    }
}

enum DebtSeverity: String, Codable {
    case low = "Low"
    case medium = "Medium"
    case high = "High"
    case critical = "Critical"

    var color: String {
        switch self {
        case .low: return "green"
        case .medium: return "yellow"
        case .high: return "orange"
        case .critical: return "red"
        }
    }
}

// MARK: - Development Metrics

struct DevelopmentMetrics: Codable, Equatable {
    var sprintVelocity: Double // story points per period
    var bugCount: Int
    var bugBacklog: Int
    var testCoverage: Double // 0-1
    var deploymentFrequency: Double // deploys per week
    var codeReviewEnabled: Bool
    var refactoringTimePercent: Double // 0-1 (% of time spent refactoring)
    var codeChurnRate: Double // 0-1 (% of code changed monthly)

    init(
        sprintVelocity: Double = 10.0,
        bugCount: Int = 0,
        bugBacklog: Int = 0,
        testCoverage: Double = 0.5,
        deploymentFrequency: Double = 1.0,
        codeReviewEnabled: Bool = false,
        refactoringTimePercent: Double = 0.1,
        codeChurnRate: Double = 0.15
    ) {
        self.sprintVelocity = sprintVelocity
        self.bugCount = bugCount
        self.bugBacklog = bugBacklog
        self.testCoverage = testCoverage
        self.deploymentFrequency = deploymentFrequency
        self.codeReviewEnabled = codeReviewEnabled
        self.refactoringTimePercent = refactoringTimePercent
        self.codeChurnRate = codeChurnRate
    }

    var quality: CodeQuality {
        let qualityScore = (testCoverage * 0.4) +
                          (codeReviewEnabled ? 0.3 : 0.0) +
                          (refactoringTimePercent * 0.3)

        if qualityScore >= 0.8 {
            return .excellent
        } else if qualityScore >= 0.6 {
            return .good
        } else if qualityScore >= 0.4 {
            return .fair
        } else {
            return .poor
        }
    }
}

enum CodeQuality: String, Codable {
    case excellent = "Excellent"
    case good = "Good"
    case fair = "Fair"
    case poor = "Poor"

    var multiplier: Double {
        switch self {
        case .excellent: return 1.3
        case .good: return 1.1
        case .fair: return 1.0
        case .poor: return 0.8
        }
    }
}
