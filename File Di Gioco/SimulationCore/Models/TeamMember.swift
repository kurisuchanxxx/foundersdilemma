import Foundation

enum TeamRole: String, Codable, CaseIterable {
    case engineer = "Engineer"
    case product = "Product"
    case designer = "Designer"
    case growth = "Growth"
    case sales = "Sales"
    case ops = "Ops"
    case customerSuccess = "CustomerSuccess"
    case finance = "Finance"

    var iconName: String {
        switch self {
        case .engineer: return "chevron.left.forwardslash.chevron.right"
        case .product: return "cube.box.fill"
        case .designer: return "paintbrush.pointed.fill"
        case .growth: return "chart.line.uptrend.xyaxis"
        case .sales: return "dollarsign.circle.fill"
        case .ops: return "gearshape.fill"
        case .customerSuccess: return "person.2.fill"
        case .finance: return "banknote.fill"
        }
    }
}

// Note: Seniority enum moved to CandidateCV.swift for extended functionality

struct TeamStats: Codable, Equatable {
    var eng: Int
    var product: Int
    var design: Int
    var growth: Int
    var sales: Int
    var ops: Int
    var cs: Int

    static let zero = TeamStats(eng: 0, product: 0, design: 0, growth: 0, sales: 0, ops: 0, cs: 0)
}

struct TeamMember: Codable, Identifiable, Equatable {
    let id: String
    let name: String
    let role: TeamRole
    let seniority: Seniority
    let salaryAnnual: Double
    let stats: TeamStats
    let perks: [String]
    let riskTags: [String]
    var morale: Double
    var tenureYears: Int

    init(
        id: String,
        name: String,
        role: TeamRole,
        seniority: Seniority,
        salaryAnnual: Double,
        stats: TeamStats,
        perks: [String],
        riskTags: [String],
        morale: Double = 1.0,
        tenureYears: Int = 0
    ) {
        self.id = id
        self.name = name
        self.role = role
        self.seniority = seniority
        self.salaryAnnual = salaryAnnual
        self.stats = stats
        self.perks = perks
        self.riskTags = riskTags
        self.morale = morale
        self.tenureYears = tenureYears
    }
}

struct Candidate: Codable, Identifiable, Equatable {
    let id: String
    let name: String
    let role: TeamRole
    let seniority: Seniority
    let salaryAnnual: Double
    let stats: TeamStats
    let perks: [String]
    let riskTags: [String]

    func toTeamMember() -> TeamMember {
        TeamMember(
            id: id,
            name: name,
            role: role,
            seniority: seniority,
            salaryAnnual: salaryAnnual,
            stats: stats,
            perks: perks,
            riskTags: riskTags,
            morale: 1.0,
            tenureYears: 0
        )
    }
}

extension Candidate {
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        name = try container.decode(String.self, forKey: .name)

        let roleString = try container.decode(String.self, forKey: .role)
        role = TeamRole(rawValue: roleString) ?? .engineer

        let seniorityString = try container.decode(String.self, forKey: .seniority)
        seniority = Seniority(rawValue: seniorityString) ?? .mid

        salaryAnnual = try container.decode(Double.self, forKey: .salaryAnnual)
        stats = try container.decode(TeamStats.self, forKey: .stats)
        perks = try container.decode([String].self, forKey: .perks)
        riskTags = try container.decode([String].self, forKey: .riskTags)
    }

    enum CodingKeys: String, CodingKey {
        case id, name, role, seniority, salaryAnnual, stats, perks, riskTags
    }
}
