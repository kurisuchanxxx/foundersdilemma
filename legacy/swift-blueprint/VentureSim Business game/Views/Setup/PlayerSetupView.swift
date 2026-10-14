import SwiftUI

struct PlayerSetupView: View {
    @Binding var playersData: [PlayerSetupData]
    let mode: GameMode
    let turnDurationHours: Int
    let onComplete: () -> Void

    @State private var currentPlayerIndex = 0
    @Environment(\.dismiss) private var dismiss

    var currentPlayer: Binding<PlayerSetupData> {
        $playersData[currentPlayerIndex]
    }

    var body: some View {
        VStack(spacing: 24) {
            Text("Player \(currentPlayerIndex + 1) Setup")
                .font(.largeTitle)
                .fontWeight(.bold)

            if currentPlayer.wrappedValue.type == .human {
                ScrollView {
                    VStack(alignment: .leading, spacing: 20) {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Company Name")
                                .font(.headline)
                            TextField("Enter company name", text: currentPlayer.companyName)
                                .textFieldStyle(.roundedBorder)
                        }

                        VStack(alignment: .leading, spacing: 8) {
                            Text("Product Name")
                                .font(.headline)
                            TextField("Enter product name", text: currentPlayer.productName)
                                .textFieldStyle(.roundedBorder)
                        }

                        VStack(alignment: .leading, spacing: 8) {
                            Text("Sector")
                                .font(.headline)
                            Picker("", selection: currentPlayer.sector) {
                                ForEach(Sector.allCases, id: \.self) { sector in
                                    Text(sector.rawValue).tag(sector)
                                }
                            }
                            .pickerStyle(.segmented)
                        }

                        VStack(alignment: .leading, spacing: 8) {
                            Text("Risk Level")
                                .font(.headline)
                            Picker("", selection: currentPlayer.riskLevel) {
                                ForEach(RiskLevel.allCases, id: \.self) { level in
                                    Text(level.rawValue).tag(level)
                                }
                            }
                            .pickerStyle(.segmented)
                        }

                        VStack(alignment: .leading, spacing: 8) {
                            Text("Founder Profile")
                                .font(.headline)
                            ForEach(FounderProfile.allCases, id: \.self) { profile in
                                Button(action: {
                                    currentPlayer.wrappedValue.founderProfile = profile
                                }) {
                                    HStack {
                                        Image(systemName: profile.iconName)
                                        VStack(alignment: .leading) {
                                            Text(profile.rawValue)
                                                .font(.headline)
                                            Text(profile.description)
                                                .font(.caption)
                                                .foregroundColor(.secondary)
                                        }
                                        Spacer()
                                        if currentPlayer.wrappedValue.founderProfile == profile {
                                            Image(systemName: "checkmark.circle.fill")
                                                .foregroundColor(.accentColor)
                                        }
                                    }
                                    .padding()
                                    .background(currentPlayer.wrappedValue.founderProfile == profile ? Color.accentColor.opacity(0.1) : Color(NSColor.controlBackgroundColor))
                                    .cornerRadius(8)
                                }
                                .buttonStyle(.plain)
                            }
                        }

                        VStack(alignment: .leading, spacing: 8) {
                            Text("Co-founder (Optional)")
                                .font(.headline)
                            Picker("", selection: Binding(
                                get: { currentPlayer.wrappedValue.cofounderProfile ?? .hacker },
                                set: { currentPlayer.wrappedValue.cofounderProfile = $0 }
                            )) {
                                Text("None").tag(FounderProfile?.none as FounderProfile?)
                                ForEach(FounderProfile.allCases, id: \.self) { profile in
                                    Text(profile.rawValue).tag(profile as FounderProfile?)
                                }
                            }
                        }
                    }
                    .padding()
                }
            } else {
                Text("Bot player - auto-configured")
                    .font(.title3)
                    .foregroundColor(.secondary)
                    .padding()
            }

            HStack {
                if currentPlayerIndex > 0 {
                    Button("Back") {
                        currentPlayerIndex -= 1
                    }
                }

                Spacer()

                if currentPlayerIndex < playersData.count - 1 {
                    Button("Next") {
                        currentPlayerIndex += 1
                    }
                    .buttonStyle(.borderedProminent)
                } else {
                    Button("Start Game") {
                        onComplete()
                        dismiss()
                    }
                    .buttonStyle(.borderedProminent)
                }
            }
            .padding()
        }
        .frame(minWidth: 600, minHeight: 700)
        .padding()
    }
}
