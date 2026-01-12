import Foundation

/// Seeded pseudo-random number generator for deterministic simulation
final class SeededRandom {
    private var state: UInt64

    init(seed: UInt64) {
        self.state = seed
    }

    /// Linear Congruential Generator (LCG) for deterministic random numbers
    func next() -> UInt64 {
        state = state &* 6364136223846793005 &+ 1442695040888963407
        return state
    }

    /// Random integer in range [min, max]
    func nextInt(min: Int, max: Int) -> Int {
        guard max >= min else { return min }
        let range = UInt64(max - min + 1)
        return min + Int(next() % range)
    }

    /// Random double in range [0.0, 1.0)
    func nextDouble() -> Double {
        return Double(next()) / Double(UInt64.max)
    }

    /// Random double in range [min, max)
    func nextDouble(min: Double, max: Double) -> Double {
        return min + nextDouble() * (max - min)
    }

    /// Random boolean
    func nextBool() -> Bool {
        return next() % 2 == 0
    }

    /// Random element from array
    func randomElement<T>(from array: [T]) -> T? {
        guard !array.isEmpty else { return nil }
        let index = nextInt(min: 0, max: array.count - 1)
        return array[index]
    }
}
