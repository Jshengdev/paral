// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "ParalBody",
    platforms: [.macOS(.v14)],
    targets: [
        .target(name: "ParalBody"),
        .executableTarget(name: "paral", dependencies: ["ParalBody"]),
        .executableTarget(name: "paral-headless", dependencies: ["ParalBody"]),
    ]
)
