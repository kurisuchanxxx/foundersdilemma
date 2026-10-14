import XCTest
@testable import SimulationCore

final class SeededRandomTests: XCTestCase {
    func testDeterminism() {
        let seed: UInt64 = 42
        let rng1 = SeededRandom(seed: seed)
        let rng2 = SeededRandom(seed: seed)

        let values1 = (0..<10).map { _ in rng1.next() }
        let values2 = (0..<10).map { _ in rng2.next() }

        XCTAssertEqual(values1, values2, "Same seed should produce identical sequences")
    }

    func testIntRange() {
        let rng = SeededRandom(seed: 123)
        let min = 10
        let max = 20

        for _ in 0..<100 {
            let value = rng.nextInt(min: min, max: max)
            XCTAssertGreaterThanOrEqual(value, min)
            XCTAssertLessThanOrEqual(value, max)
        }
    }

    func testDoubleRange() {
        let rng = SeededRandom(seed: 456)

        for _ in 0..<100 {
            let value = rng.nextDouble()
            XCTAssertGreaterThanOrEqual(value, 0.0)
            XCTAssertLessThan(value, 1.0)
        }
    }

    func testDoubleRangeCustom() {
        let rng = SeededRandom(seed: 789)
        let min = 5.0
        let max = 15.0

        for _ in 0..<100 {
            let value = rng.nextDouble(min: min, max: max)
            XCTAssertGreaterThanOrEqual(value, min)
            XCTAssertLessThan(value, max)
        }
    }

    func testRandomElement() {
        let rng = SeededRandom(seed: 999)
        let array = [1, 2, 3, 4, 5]

        for _ in 0..<20 {
            if let element = rng.randomElement(from: array) {
                XCTAssertTrue(array.contains(element))
            }
        }

        let emptyArray: [Int] = []
        XCTAssertNil(rng.randomElement(from: emptyArray))
    }
}
