import SwiftUI

struct GameSetupView: View {
    @EnvironmentObject var gameViewModel: GameViewModel
    @State private var selectedMode: GameMode = .soloVsBot
    @State private var playerCount: Int = 2
    @State private var turnDurationHours: Int = 48
    @State private var playersData: [PlayerSetupData] = []
    @State private var showPlayerSetup = false

    var body: some View {
        ZStack {
            Color(NSColor.windowBackgroundColor).ignoresSafeArea()

            VStack(spacing: 40) {
                VStack(spacing: 8) {
                    Text("VentureSim")
                        .font(.system(size: 48, weight: .bold, design: .rounded))
                    Text("Build your startup empire")
                        .font(.title3)
                        .foregroundColor(.secondary)
                }

                VStack(alignment: .leading, spacing: 24) {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Game Mode")
                            .font(.headline)
                        Picker("", selection: $selectedMode) {
                            ForEach([GameMode.soloVsBot, .hotSeat], id: \.self) { mode in
                                Text(mode.rawValue).tag(mode)
                            }
                        }
                        .pickerStyle(.segmented)
                        .frame(maxWidth: 400)
                    }

                    VStack(alignment: .leading, spacing: 12) {
                        Text("Number of Players")
                            .font(.headline)
                        Stepper(value: $playerCount, in: 2...10) {
                            Text("\(playerCount) players")
                        }
                        .frame(maxWidth: 400)
                    }

                    if selectedMode == .hotSeat {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Turn Duration")
                                .font(.headline)
                            Picker("", selection: $turnDurationHours) {
                                Text("24 hours").tag(24)
                                Text("48 hours").tag(48)
                            }
                            .pickerStyle(.segmented)
                            .frame(maxWidth: 400)
                        }
                    }

                    Button(action: {
                        initializePlayersData()
                        showPlayerSetup = true
                    }) {
                        Text("Continue to Player Setup")
                            .font(.headline)
                            .frame(maxWidth: 400)
                            .padding()
                            .background(Color.accentColor)
                            .foregroundColor(.white)
                            .cornerRadius(12)
                    }
                }
                .padding(32)
                .background(Color(NSColor.controlBackgroundColor))
                .cornerRadius(16)
            }
            .frame(maxWidth: 600)
            .padding()
        }
        .sheet(isPresented: $showPlayerSetup) {
            PlayerSetupView(
                playersData: $playersData,
                mode: selectedMode,
                turnDurationHours: turnDurationHours,
                onComplete: startGame
            )
        }
    }

    private func initializePlayersData() {
        playersData = []
        let humanCount = selectedMode == .soloVsBot ? 1 : playerCount
        let botCount = selectedMode == .soloVsBot ? (playerCount - 1) : 0

        for i in 0..<humanCount {
            playersData.append(PlayerSetupData(
                type: .human,
                companyName: "Startup \(i + 1)",
                sector: .saasB2B,
                productName: "Product \(i + 1)",
                riskLevel: .medium,
                founderProfile: .hacker,
                cofounderProfile: nil
            ))
        }

        for i in 0..<botCount {
            playersData.append(PlayerSetupData(
                type: .bot,
                companyName: "Bot Startup \(i + 1)",
                sector: Sector.allCases.randomElement() ?? .saasB2B,
                productName: "Bot Product \(i + 1)",
                riskLevel: RiskLevel.allCases.randomElement() ?? .medium,
                founderProfile: FounderProfile.allCases.randomElement() ?? .hacker,
                cofounderProfile: FounderProfile.allCases.randomElement()
            ))
        }
    }

    private func startGame() {
        let config = GameConfig(
            mode: selectedMode,
            playerCount: playerCount,
            botCount: selectedMode == .soloVsBot ? (playerCount - 1) : 0,
            turnDurationHours: turnDurationHours
        )

        let players = playersData.map { data in
            Player(
                type: data.type,
                companyName: data.companyName,
                sector: data.sector,
                productName: data.productName,
                riskLevel: data.riskLevel,
                founderProfile: data.founderProfile,
                cofounderProfile: data.cofounderProfile
            )
        }

        gameViewModel.startNewGame(config: config, players: players)
    }
}

struct PlayerSetupData: Identifiable {
    let id = UUID()
    var type: PlayerType
    var companyName: String
    var sector: Sector
    var productName: String
    var riskLevel: RiskLevel
    var founderProfile: FounderProfile
    var cofounderProfile: FounderProfile?
}
