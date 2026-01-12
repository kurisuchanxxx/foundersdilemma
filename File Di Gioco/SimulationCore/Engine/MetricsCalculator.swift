import Foundation

struct MetricsCalculator {
    static func calculateCAC(
        sector: Sector,
        marketingSpend: Double,
        marketingEfficiency: Double,
        gtmFocus: GTMFocus,
        year: Int
    ) -> Double {
        let baseCAC = sector.parameters.baseCAC
        let efficiencyFactor = max(0.5, 2.0 - marketingEfficiency)
        let gtmMultiplier = gtmFocus.cacMultiplier
        let yearDiscount = 1.0 / Double(year + 1)

        let calculatedCAC = baseCAC * efficiencyFactor * gtmMultiplier * (1.0 - yearDiscount * 0.2)
        return max(1.0, calculatedCAC)
    }

    static func calculateLTV(
        sector: Sector,
        pricing: Double,
        salesEfficiency: Double,
        productQuality: Double,
        gtmFocus: GTMFocus,
        churnRate: Double
    ) -> Double {
        let baseLTV = sector.parameters.baseLTV
        let pricingFactor = pricing / (sector.parameters.baseCAC * 10)
        let qualityBonus = productQuality
        let salesBonus = salesEfficiency
        let gtmMultiplier = gtmFocus.ltmMultiplier
        let churnPenalty = max(0.5, 1.0 - churnRate)

        let ltv = baseLTV * pricingFactor * qualityBonus * salesBonus * gtmMultiplier * churnPenalty
        return max(10.0, ltv)
    }

    static func calculateChurnRate(
        sector: Sector,
        productQuality: Double,
        customerSuccessReduction: Double,
        year: Int
    ) -> Double {
        let baseChurn = sector.parameters.baseChurnRate
        let qualityFactor = max(0.5, 2.0 - productQuality)
        let csReduction = customerSuccessReduction
        let yearImprovement = Double(year) * 0.01

        let churn = baseChurn * qualityFactor - csReduction - yearImprovement
        return max(0.01, min(0.5, churn))
    }

    static func calculateNewCustomers(
        marketingSpend: Double,
        cac: Double,
        salesEfficiency: Double
    ) -> Int {
        guard cac > 0 else { return 0 }
        let rawCustomers = marketingSpend / cac
        let salesBonus = salesEfficiency
        return max(0, Int(rawCustomers * salesBonus))
    }

    static func calculateRevenue(
        customers: Int,
        pricing: Double,
        grossMargin: Double
    ) -> Double {
        let rawRevenue = Double(customers) * pricing
        return rawRevenue * grossMargin
    }

    static func calculateBurnRate(
        rndSpend: Double,
        marketingSpend: Double,
        opsSpend: Double,
        teamCost: Double
    ) -> Double {
        return rndSpend + marketingSpend + opsSpend + teamCost
    }

    static func calculateMVPProgress(
        currentProgress: Double,
        rndSpend: Double,
        rndEfficiency: Double,
        developmentMonths: Int,
        sector: Sector
    ) -> Double {
        let spendFactor = rndSpend / 50_000.0
        let efficiencyBonus = rndEfficiency
        let timeFactor = Double(developmentMonths) / 12.0
        let sectorMultiplier = 1.0 / sector.parameters.developmentTimeMultiplier

        let progressDelta = spendFactor * efficiencyBonus * timeFactor * sectorMultiplier * 0.5
        let newProgress = currentProgress + progressDelta
        return min(1.0, newProgress)
    }
}
