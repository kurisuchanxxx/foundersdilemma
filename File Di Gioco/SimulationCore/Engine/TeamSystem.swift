import Foundation

struct TeamSystem {
    static func calculateTotalTeamCost(team: [TeamMember]) -> Double {
        team.reduce(0) { $0 + $1.salaryAnnual }
    }

    static func calculateHeadcount(team: [TeamMember]) -> Int {
        team.count
    }

    static func calculateAggregatedStats(team: [TeamMember]) -> TeamStats {
        var total = TeamStats.zero
        for member in team {
            total.eng += member.stats.eng
            total.product += member.stats.product
            total.design += member.stats.design
            total.growth += member.stats.growth
            total.sales += member.stats.sales
            total.ops += member.stats.ops
            total.cs += member.stats.cs
        }
        return total
    }

    static func calculateRnDEfficiency(team: [TeamMember], founderMultipliers: FounderProfile.Multipliers) -> Double {
        let stats = calculateAggregatedStats(team: team)
        let baseEfficiency = Double(stats.eng + stats.product) / 10.0
        let founderBonus = founderMultipliers.rndEfficiency
        let morale = calculateMorale(team: team)
        return max(0.1, baseEfficiency * founderBonus * morale)
    }

    static func calculateMarketingEfficiency(team: [TeamMember], founderMultipliers: FounderProfile.Multipliers) -> Double {
        let stats = calculateAggregatedStats(team: team)
        let baseEfficiency = Double(stats.growth + stats.design) / 10.0
        let founderBonus = founderMultipliers.marketingEfficiency
        let morale = calculateMorale(team: team)
        return max(0.1, baseEfficiency * founderBonus * morale)
    }

    static func calculateSalesEfficiency(team: [TeamMember], founderMultipliers: FounderProfile.Multipliers) -> Double {
        let stats = calculateAggregatedStats(team: team)
        let baseEfficiency = Double(stats.sales) / 10.0
        let founderBonus = founderMultipliers.salesEfficiency
        let morale = calculateMorale(team: team)
        return max(0.1, baseEfficiency * founderBonus * morale)
    }

    static func calculateOpsEfficiency(team: [TeamMember], founderMultipliers: FounderProfile.Multipliers) -> Double {
        let stats = calculateAggregatedStats(team: team)
        let baseEfficiency = Double(stats.ops) / 10.0
        let founderBonus = founderMultipliers.operationsEfficiency
        let morale = calculateMorale(team: team)
        return max(0.1, baseEfficiency * founderBonus * morale)
    }

    static func calculateProductQuality(team: [TeamMember], founderMultipliers: FounderProfile.Multipliers) -> Double {
        let stats = calculateAggregatedStats(team: team)
        let baseQuality = Double(stats.eng + stats.product + stats.design) / 15.0
        let founderBonus = founderMultipliers.productQuality
        return max(0.1, baseQuality * founderBonus)
    }

    static func calculateMorale(team: [TeamMember]) -> Double {
        guard !team.isEmpty else { return 1.0 }
        let totalMorale = team.reduce(0.0) { $0 + $1.morale }
        return totalMorale / Double(team.count)
    }

    static func calculateExecutionVelocity(team: [TeamMember], headcount: Int) -> Double {
        guard headcount > 0 else { return 0.5 }
        let coordinationPenalty = headcount > 10 ? 0.9 : 1.0
        let morale = calculateMorale(team: team)
        return max(0.1, morale * coordinationPenalty)
    }

    static func calculateChurnReduction(team: [TeamMember]) -> Double {
        let stats = calculateAggregatedStats(team: team)
        let csScore = Double(stats.cs) / 20.0
        return min(0.5, csScore)
    }

    static func updateMorale(team: inout [TeamMember], cashStress: Double, rng: SeededRandom) {
        for i in 0..<team.count {
            var newMorale = team[i].morale

            if cashStress > 0.7 {
                newMorale -= 0.1
            } else if cashStress < 0.3 {
                newMorale += 0.05
            }

            if team[i].riskTags.contains("burnout") && rng.nextDouble() < 0.2 {
                newMorale -= 0.15
            }

            team[i].morale = max(0.1, min(1.0, newMorale))
            team[i].tenureYears += 1
        }
    }
}
