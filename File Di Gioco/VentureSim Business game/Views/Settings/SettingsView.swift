import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var gameViewModel: GameViewModel
    @AppStorage("appearance") private var appearance: String = "auto"

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                Text("Settings")
                    .font(.title)
                    .fontWeight(.bold)

                VStack(alignment: .leading, spacing: 16) {
                    Text("Appearance")
                        .font(.headline)

                    Picker("", selection: $appearance) {
                        Text("Auto").tag("auto")
                        Text("Light").tag("light")
                        Text("Dark").tag("dark")
                    }
                    .pickerStyle(.segmented)
                    .onChange(of: appearance) { _, newValue in
                        updateAppearance(newValue)
                    }
                }
                .padding()
                .background(Color(NSColor.controlBackgroundColor))
                .cornerRadius(12)

                VStack(alignment: .leading, spacing: 16) {
                    Text("Game Actions")
                        .font(.headline)

                    Button("New Game") {
                        gameViewModel.currentScreen = .setup
                    }
                    .buttonStyle(.bordered)

                    Button("Export Save") {
                        // TODO: Implement persistence
                    }
                    .buttonStyle(.bordered)
                }
                .padding()
                .background(Color(NSColor.controlBackgroundColor))
                .cornerRadius(12)

                Spacer()
            }
            .padding()
        }
    }

    private func updateAppearance(_ value: String) {
        switch value {
        case "light":
            NSApp.appearance = NSAppearance(named: .aqua)
        case "dark":
            NSApp.appearance = NSAppearance(named: .darkAqua)
        default:
            NSApp.appearance = nil
        }
    }
}
