// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "VentureSim",
    platforms: [.macOS(.v14)],
    products: [
        .executable(name: "VentureSim", targets: ["VentureSim"])
    ],
    targets: [
        .executableTarget(
            name: "VentureSim",
            path: "VentureSim",
            resources: [.process("../SimulationCore/Data/candidates.json")],
            swiftSettings: [.enableExperimentalFeature("StrictConcurrency")]
        ),
        .target(
            name: "SimulationCore",
            path: "SimulationCore"
        ),
        .testTarget(
            name: "SimulationCoreTests",
            dependencies: ["SimulationCore"],
            path: "SimulationCoreTests"
        )
    ]
)
