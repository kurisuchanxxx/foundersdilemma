import XCTest
@testable import SimulationCore

final class MetricsCalculatorTests: XCTestCase {
    func testCACCalculation() {
        let sector = Sector.saasB2B
        let marketingSpend = 100_000.0
        let marketingEfficiency = 1.2
        let gtmFocus = GTMFocus.performance
        let year = 1

        let cac = MetricsCalculator.calculateCAC(
            sector: sector,
            marketingSpend: marketingSpend,
            marketingEfficiency: marketingEfficiency,
            gtmFocus: gtmFocus,
            year: year
        )

        XCTAssertGreaterThanOrEqual(cac, 1.0)
    }

    func testLTVCalculation() {
        let sector = Sector.saasB2B
        let pricing = 10_000.0
        let salesEfficiency = 1.1
        let productQuality = 1.3
        let gtmFocus = GTMFocus.brand
        let churnRate = 0.05

        let ltv = MetricsCalculator.calculateLTV(
            sector: sector,
            pricing: pricing,
            salesEfficiency: salesEfficiency,
            productQuality: productQuality,
            gtmFocus: gtmFocus,
            churnRate: churnRate
        )

        XCTAssertGreaterThanOrEqual(ltv, 10.0)
    }

    func testNewCustomersCalculation() {
        let marketingSpend = 50_000.0
        let cac = 1_000.0
        let salesEfficiency = 1.2

        let customers = MetricsCalculator.calculateNewCustomers(
            marketingSpend: marketingSpend,
            cac: cac,
            salesEfficiency: salesEfficiency
        )

        XCTAssertGreaterThanOrEqual(customers, 0)
        XCTAssertEqual(customers, Int((marketingSpend / cac) * salesEfficiency))
    }

    func testBurnRateCalculation() {
        let rndSpend = 30_000.0
        let marketingSpend = 40_000.0
        let opsSpend = 10_000.0
        let teamCost = 50_000.0

        let burn = MetricsCalculator.calculateBurnRate(
            rndSpend: rndSpend,
            marketingSpend: marketingSpend,
            opsSpend: opsSpend,
            teamCost: teamCost
        )

        XCTAssertEqual(burn, 130_000.0)
    }

    func testMVPProgress() {
        let currentProgress = 0.3
        let rndSpend = 50_000.0
        let rndEfficiency = 1.5
        let developmentMonths = 6
        let sector = Sector.saasB2B

        let newProgress = MetricsCalculator.calculateMVPProgress(
            currentProgress: currentProgress,
            rndSpend: rndSpend,
            rndEfficiency: rndEfficiency,
            developmentMonths: developmentMonths,
            sector: sector
        )

        XCTAssertGreaterThan(newProgress, currentProgress)
        XCTAssertLessThanOrEqual(newProgress, 1.0)
    }
}
