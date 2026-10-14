import Foundation

// MARK: - Candidate Loader

/// Loads professional candidates from JSON and generates CVs + preferences
struct CandidateLoader {

    // MARK: - Load Candidates

    static func loadProfessionalCandidates() -> ([Candidate], [String: CandidateCV], [String: CandidatePreferences]) {
        var candidates: [Candidate] = []
        var cvs: [String: CandidateCV] = [:]
        var preferences: [String: CandidatePreferences] = [:]

        // Try to load from professional JSON first
        if let loaded = loadFromJSON(filename: "candidates_professional") {
            candidates = loaded.candidates
            cvs = loaded.cvs
            preferences = loaded.preferences
        }

        // Fallback to basic JSON if professional not found
        if candidates.isEmpty {
            if let loaded = loadFromJSON(filename: "candidates") {
                candidates = loaded.candidates
                cvs = loaded.cvs
                preferences = loaded.preferences
            }
        }

        // If still empty, generate some basic candidates
        if candidates.isEmpty {
            let generated = generateBasicCandidates(count: 30)
            candidates = generated.candidates
            cvs = generated.cvs
            preferences = generated.preferences
        }

        return (candidates, cvs, preferences)
    }

    // MARK: - JSON Loading

    private static func loadFromJSON(filename: String) -> (candidates: [Candidate], cvs: [String: CandidateCV], preferences: [String: CandidatePreferences])? {
        // Try to find JSON file in bundle
        guard let url = Bundle.main.url(forResource: filename, withExtension: "json") else {
            print("⚠️ Could not find \(filename).json in bundle")
            return nil
        }

        do {
            let data = try Data(contentsOf: url)
            let decoder = JSONDecoder()

            // Decode array of professional candidates (with embedded CVs)
            let professionalCandidates = try decoder.decode([ProfessionalCandidateData].self, from: data)

            var candidates: [Candidate] = []
            var cvs: [String: CandidateCV] = [:]
            var preferences: [String: CandidatePreferences] = [:]

            for profData in professionalCandidates {
                // Create basic Candidate
                let candidate = Candidate(
                    id: profData.id,
                    name: profData.name,
                    role: profData.role,
                    seniority: profData.seniority,
                    salaryAnnual: profData.salaryAnnual,
                    stats: profData.stats,
                    perks: profData.perks,
                    riskTags: profData.riskTags
                )
                candidates.append(candidate)

                // Create CV if embedded
                if let cvData = profData.cv {
                    let cv = CandidateCV(
                        candidateId: profData.id,
                        age: cvData.age,
                        education: cvData.education,
                        experiences: cvData.experiences,
                        skills: cvData.skills,
                        achievements: cvData.achievements,
                        hiddenBonuses: cvData.hiddenBonuses
                    )
                    cvs[profData.id] = cv
                } else {
                    // Generate basic CV
                    cvs[profData.id] = generateBasicCV(for: candidate)
                }

                // Generate preferences based on seniority
                preferences[profData.id] = CandidatePreferences.defaultPreferences(
                    for: profData.id,
                    seniority: profData.seniority
                )
            }

            print("✅ Loaded \(candidates.count) professional candidates from \(filename).json")
            return (candidates, cvs, preferences)
        } catch {
            print("❌ Error loading candidates from \(filename).json: \(error)")
            return nil
        }
    }

    // MARK: - Basic Generation

    private static func generateBasicCandidates(count: Int) -> (candidates: [Candidate], cvs: [String: CandidateCV], preferences: [String: CandidatePreferences]) {
        var candidates: [Candidate] = []
        var cvs: [String: CandidateCV] = [:]
        var preferences: [String: CandidatePreferences] = [:]

        let names = ["Alice Johnson", "Bob Smith", "Carol Williams", "David Brown", "Emma Davis"]
        let roles: [TeamRole] = [.engineer, .product, .designer, .growth, .sales]
        let seniorities: [Seniority] = [.junior, .mid, .senior]

        for i in 0..<count {
            let id = "gen_\(i)"
            let name = names[i % names.count]
            let role = roles[i % roles.count]
            let seniority = seniorities[i % seniorities.count]

            let candidate = Candidate(
                id: id,
                name: "\(name) \(i/5 + 1)",
                role: role,
                seniority: seniority,
                salaryAnnual: seniority.quarterlySalaryRange.min * 4,
                stats: TeamStats(eng: 5, product: 5, design: 5, growth: 5, sales: 5, ops: 5, cs: 5),
                perks: [],
                riskTags: []
            )

            candidates.append(candidate)
            cvs[id] = generateBasicCV(for: candidate)
            preferences[id] = CandidatePreferences.defaultPreferences(for: id, seniority: seniority)
        }

        print("⚠️ Generated \(count) basic candidates (fallback)")
        return (candidates, cvs, preferences)
    }

    private static func generateBasicCV(for candidate: Candidate) -> CandidateCV {
        let education = Education(
            university: "State University",
            degree: "BS",
            field: "Computer Science",
            graduated: 2018
        )

        let experience = Experience(
            company: "Previous Company",
            role: candidate.role.rawValue,
            yearsWorked: 2.0,
            description: "Worked on \(candidate.role.rawValue) projects",
            isKeyExperience: false
        )

        return CandidateCV(
            candidateId: candidate.id,
            age: 28,
            education: education,
            experiences: [experience],
            skills: [],
            achievements: [],
            hiddenBonuses: []
        )
    }
}

// MARK: - Professional Candidate Data (for JSON decoding)

struct ProfessionalCandidateData: Codable {
    let id: String
    let name: String
    let role: TeamRole
    let seniority: Seniority
    let salaryAnnual: Double
    let stats: TeamStats
    let perks: [String]
    let riskTags: [String]
    let cv: CVData?

    struct CVData: Codable {
        let age: Int
        let education: Education
        let experiences: [Experience]
        let skills: [Skill]
        let achievements: [String]
        let hiddenBonuses: [HiddenBonus]
    }
}
