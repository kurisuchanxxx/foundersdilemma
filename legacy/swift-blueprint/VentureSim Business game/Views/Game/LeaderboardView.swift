import SwiftUI

struct LeaderboardView: View {
    @EnvironmentObject var gameViewModel: GameViewModel

    var body: some View {
        ScrollView {
            if let state = gameViewModel.gameState {
                VStack(spacing: 24) {
                    Text("Leaderboard")
                        .font(.title)
                        .fontWeight(.bold)

                    ForEach(Array(state.leaderboard.enumerated()), id: \.element.id) { index, player in
                        PlayerCard(player: player, rank: index + 1, isSelected: gameViewModel.selectedPlayerId == player.id, onSelect: {
                            gameViewModel.selectedPlayerId = player.id
                        })
                    }
                }
                .padding()
            }
        }
    }
}

struct PlayerCard: View {
    let player: Player
    let rank: Int
    let isSelected: Bool
    let onSelect: () -> Void

    var body: some View {
        Button(action: onSelect) {
            HStack {
                Text("#\(rank)")
                    .font(.title)
                    .fontWeight(.bold)
                    .foregroundColor(rankColor)
                    .frame(width: 50)

                VStack(alignment: .leading, spacing: 4) {
                    Text(player.companyName)
                        .font(.headline)
                    Text(player.productName)
                        .font(.caption)
                        .foregroundColor(.secondary)
                    if player.metrics.exitAccepted {
                        Text("EXITED - Year \(player.metrics.exitYear ?? 0)")
                            .font(.caption)
                            .foregroundColor(.green)
                    }
                }

                Spacer()

                VStack(alignment: .trailing, spacing: 4) {
                    Text(formatCurrency(player.metrics.valuation))
                        .font(.headline)
                    Text("\(player.metrics.customers) customers")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            .padding()
            .background(isSelected ? Color.accentColor.opacity(0.2) : Color(NSColor.controlBackgroundColor))
            .cornerRadius(12)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(isSelected ? Color.accentColor : Color.clear, lineWidth: 2)
            )
        }
        .buttonStyle(.plain)
    }

    private var rankColor: Color {
        switch rank {
        case 1: return .yellow
        case 2: return .gray
        case 3: return .orange
        default: return .secondary
        }
    }

    private func formatCurrency(_ value: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.maximumFractionDigits = 0
        return formatter.string(from: NSNumber(value: value)) ?? "$0"
    }
}
