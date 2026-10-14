import SwiftUI

@main
struct VentureSimApp: App {
    @StateObject private var gameViewModel = GameViewModel()

    var body: some Scene {
        WindowGroup {
            MainView()
                .environmentObject(gameViewModel)
                .frame(minWidth: 1200, minHeight: 800)
        }
        .commands {
            CommandGroup(replacing: .newItem) {}
        }
    }
}
