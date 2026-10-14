import Foundation

// MARK: - Candidate CV Models

enum Seniority: String, Codable, CaseIterable {
    case junior = "Junior"
    case mid = "Mid"
    case senior = "Senior"
    case staff = "Staff"
    case principal = "Principal"

    var salaryMultiplier: Double {
        switch self {
        case .junior: return 0.7
        case .mid: return 1.0
        case .senior: return 1.5
        case .staff: return 2.0
        case .principal: return 2.5
        }
    }

    var quarterlySalaryRange: (min: Double, max: Double) {
        switch self {
        case .junior: return (15_000, 25_000)
        case .mid: return (25_000, 40_000)
        case .senior: return (40_000, 60_000)
        case .staff: return (60_000, 80_000)
        case .principal: return (80_000, 100_000)
        }
    }

    var semiannualSalaryRange: (min: Double, max: Double) {
        let quarterly = quarterlySalaryRange
        return (quarterly.min * 2, quarterly.max * 2)
    }

    var equityRange: (min: Double, max: Double) {
        switch self {
        case .junior: return (0.001, 0.005)      // 0.1%-0.5%
        case .mid: return (0.003, 0.01)          // 0.3%-1%
        case .senior: return (0.005, 0.02)       // 0.5%-2%
        case .staff: return (0.01, 0.04)         // 1%-4%
        case .principal: return (0.02, 0.06)     // 2%-6%
        }
    }
}

struct Education: Codable, Equatable {
    let university: String
    let degree: String
    let field: String
    let graduated: Int

    var displayString: String {
        "\(degree) in \(field), \(university) (\(graduated))"
    }
}

struct Experience: Codable, Equatable, Identifiable {
    let id: String
    let company: String
    let role: String
    let yearsWorked: Double
    let description: String
    let isKeyExperience: Bool // Trigger for hidden bonuses

    init(id: String = UUID().uuidString, company: String, role: String, yearsWorked: Double, description: String, isKeyExperience: Bool = false) {
        self.id = id
        self.company = company
        self.role = role
        self.yearsWorked = yearsWorked
        self.description = description
        self.isKeyExperience = isKeyExperience
    }

    var displayString: String {
        "\(company) - \(role) (\(String(format: "%.1f", yearsWorked))y)"
    }
}

enum SkillName: String, Codable {
    // Technical
    case python, javascript, react, typescript, golang, rust, swift
    case tensorflow, pytorch, machinelearning
    case aws, docker, kubernetes
    case postgresql, mongodb, redis

    // Product/Design
    case figma, sketch, userresearch, productmanagement
    case analytics, dataanalysis

    // Marketing/Sales
    case seo, paidads, contentmarketing
    case salesforce, hubspot, enterprisesales

    // Operations
    case finance, hiring, projectmanagement
}

struct Skill: Codable, Equatable, Identifiable {
    let id: String
    let name: SkillName
    let level: Int // 1-5

    init(id: String = UUID().uuidString, name: SkillName, level: Int) {
        self.id = id
        self.name = name
        self.level = level
    }

    var displayString: String {
        "\(name.rawValue.capitalized) (\(level)/5)"
    }
}

enum BonusEffect: String, Codable {
    case productivityBoost = "Productivity Boost"
    case techDebtReduction = "Tech Debt Reduction"
    case investorRelations = "Investor Relations"
    case codeQuality = "Code Quality"
    case hardwareIntegration = "Hardware Integration"
    case avoidPitfalls = "Avoid Pitfalls"
    case cacReduction = "CAC Reduction"
    case churnReduction = "Churn Reduction"
    case networkAccess = "Network Access"
    case brandBuilding = "Brand Building"
}

struct HiddenBonus: Codable, Equatable, Identifiable {
    let id: String
    let trigger: String // "ex_deepmind", "yc_founder", etc.
    let effect: BonusEffect
    let magnitude: Double // e.g., 0.30 for +30%
    let description: String

    init(id: String = UUID().uuidString, trigger: String, effect: BonusEffect, magnitude: Double, description: String) {
        self.id = id
        self.trigger = trigger
        self.effect = effect
        self.magnitude = magnitude
        self.description = description
    }
}

struct CandidateCV: Codable, Equatable, Identifiable {
    let id: String
    let candidateId: String
    let age: Int
    let education: Education
    let experiences: [Experience]
    let skills: [Skill]
    let achievements: [String] // Short bullet points
    let hiddenBonuses: [HiddenBonus]

    init(
        id: String = UUID().uuidString,
        candidateId: String,
        age: Int,
        education: Education,
        experiences: [Experience],
        skills: [Skill],
        achievements: [String],
        hiddenBonuses: [HiddenBonus] = []
    ) {
        self.id = id
        self.candidateId = candidateId
        self.age = age
        self.education = education
        self.experiences = experiences
        self.skills = skills
        self.achievements = achievements
        self.hiddenBonuses = hiddenBonuses
    }

    var totalYearsExperience: Double {
        experiences.reduce(0) { $0 + $1.yearsWorked }
    }

    var hasHiddenBonuses: Bool {
        !hiddenBonuses.isEmpty
    }
}

// MARK: - Candidate Preferences (for AI decision-making)

struct CandidatePreferences: Codable, Equatable {
    let candidateId: String

    // Weights for offer evaluation (sum to 1.0)
    let salaryWeight: Double
    let equityWeight: Double
    let stageWeight: Double
    let productFitWeight: Double
    let reputationWeight: Double

    // Sector preferences (-1 to 1, where 1 is strong preference)
    let sectorPreferences: [String: Double] // Sector.rawValue → score

    // Red flag tolerances
    let minRunwayMonths: Double
    let minTeamMorale: Double
    let maxAcceptableStress: Double

    init(
        candidateId: String,
        salaryWeight: Double = 0.3,
        equityWeight: Double = 0.2,
        stageWeight: Double = 0.25,
        productFitWeight: Double = 0.15,
        reputationWeight: Double = 0.1,
        sectorPreferences: [String: Double] = [:],
        minRunwayMonths: Double = 6.0,
        minTeamMorale: Double = 0.5,
        maxAcceptableStress: Double = 0.8
    ) {
        self.candidateId = candidateId
        self.salaryWeight = salaryWeight
        self.equityWeight = equityWeight
        self.stageWeight = stageWeight
        self.productFitWeight = productFitWeight
        self.reputationWeight = reputationWeight
        self.sectorPreferences = sectorPreferences
        self.minRunwayMonths = minRunwayMonths
        self.minTeamMorale = minTeamMorale
        self.maxAcceptableStress = maxAcceptableStress
    }

    // Generate default preferences based on seniority
    static func defaultPreferences(for candidateId: String, seniority: Seniority) -> CandidatePreferences {
        switch seniority {
        case .junior:
            return CandidatePreferences(
                candidateId: candidateId,
                salaryWeight: 0.4,  // Care more about cash
                equityWeight: 0.15,
                stageWeight: 0.2,   // Less risk-averse
                productFitWeight: 0.15,
                reputationWeight: 0.1,
                minRunwayMonths: 3.0,
                minTeamMorale: 0.4,
                maxAcceptableStress: 0.9
            )
        case .mid:
            return CandidatePreferences(
                candidateId: candidateId,
                salaryWeight: 0.35,
                equityWeight: 0.2,
                stageWeight: 0.2,
                productFitWeight: 0.15,
                reputationWeight: 0.1,
                minRunwayMonths: 4.0,
                minTeamMorale: 0.45,
                maxAcceptableStress: 0.85
            )
        case .senior:
            return CandidatePreferences(
                candidateId: candidateId,
                salaryWeight: 0.25,
                equityWeight: 0.25,  // More upside focused
                stageWeight: 0.3,    // Very stage-conscious
                productFitWeight: 0.12,
                reputationWeight: 0.08,
                minRunwayMonths: 6.0,
                minTeamMorale: 0.55,
                maxAcceptableStress: 0.75
            )
        case .staff, .principal:
            return CandidatePreferences(
                candidateId: candidateId,
                salaryWeight: 0.2,
                equityWeight: 0.3,   // Seeking significant upside
                stageWeight: 0.35,   // Very selective on stage
                productFitWeight: 0.1,
                reputationWeight: 0.05,
                minRunwayMonths: 9.0,
                minTeamMorale: 0.6,
                maxAcceptableStress: 0.65
            )
        }
    }
}
