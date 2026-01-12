import SwiftUI

struct DashboardView: View {
    @EnvironmentObject var gameViewModel: GameViewModel

    var body: some View {
        ScrollView {
            if let state = gameViewModel.gameState {
                VStack(spacing: 24) {
                    VStack(spacing: 8) {
                        Text(state.roundLabel)
                            .font(.system(size: 36, weight: .bold))
                        if let deadline = state.turnDeadline {
                            Text("Turn ends: \(deadline, style: .relative)")
                                .font(.title3)
                                .foregroundColor(.secondary)
                        }
                    }

                    if let playerId = gameViewModel.selectedPlayerId,
                       let player = state.players.first(where: { $0.id == playerId }) {
                        PlayerDashboard(player: player)
                    } else if state.config.mode == .hotSeat {
                        Text("Select a player from the leaderboard")
                            .foregroundColor(.secondary)
                    }

                    if state.config.mode == .hotSeat {
                        GMControlPanel(state: state)
                    }
                }
                .padding()
            }
        }
    }
}

struct PlayerDashboard: View {
    let player: Player

    var body: some View {
        VStack(spacing: 20) {
            Text(player.companyName)
                .font(.largeTitle)
                .fontWeight(.bold)

            LazyVGrid(columns: [GridItem(.adaptive(minimum: 200))], spacing: 16) {
                MetricCard(title: "Cash", value: formatCurrency(player.metrics.cash), icon: "dollarsign.circle.fill", color: .green)
                MetricCard(title: "Burn Rate", value: formatCurrency(player.metrics.burnRate), icon: "flame.fill", color: .orange)
                MetricCard(title: "Runway", value: "\(Int(player.metrics.runway)) months", icon: "timer", color: .blue)
                MetricCard(title: "Valuation", value: formatCurrency(player.metrics.valuation), icon: "chart.line.uptrend.xyaxis", color: .purple)
                MetricCard(title: "Revenue", value: formatCurrency(player.metrics.revenue), icon: "banknote.fill", color: .green)
                MetricCard(title: "Customers", value: "\(player.metrics.customers)", icon: "person.3.fill", color: .blue)
                MetricCard(title: "CAC", value: formatCurrency(player.metrics.cac), icon: "chart.bar.fill", color: .orange)
                MetricCard(title: "LTV", value: formatCurrency(player.metrics.ltv), icon: "arrow.up.right.circle.fill", color: .green)
            }
        }
    }

    private func formatCurrency(_ value: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.maximumFractionDigits = 0
        return formatter.string(from: NSNumber(value: value)) ?? "$0"
    }
}

struct GMControlPanel: View {
    let state: GameState
    @EnvironmentObject var gameViewModel: GameViewModel

    var body: some View {
        VStack(spacing: 16) {
            Text("Game Master Controls")
                .font(.headline)

            Text("Players Ready: \(state.players.filter { $0.isReady }.count)/\(state.players.filter { $0.type == .human }.count)")
                .font(.subheadline)
                .foregroundColor(.secondary)

            Button(action: {
                gameViewModel.advanceYear()
            }) {
                Text("Advance to Next Round")
                    .font(.headline)
                    .padding()
                    .frame(maxWidth: .infinity)
                    .background(Color.accentColor)
                    .foregroundColor(.white)
                    .cornerRadius(8)
            }
        }
        .padding()
        .background(Color(NSColor.controlBackgroundColor))
        .cornerRadius(12)
    }
}
