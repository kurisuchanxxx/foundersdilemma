import SwiftUI

struct TeamView: View {
    @EnvironmentObject var gameViewModel: GameViewModel

    var body: some View {
        ScrollView {
            if let state = gameViewModel.gameState,
               let playerId = gameViewModel.selectedPlayerId,
               let player = state.players.first(where: { $0.id == playerId }) {
                VStack(spacing: 24) {
                    Text("Team Management")
                        .font(.title)
                        .fontWeight(.bold)

                    VStack(alignment: .leading, spacing: 12) {
                        Text("Current Team")
                            .font(.headline)

                        if player.team.isEmpty {
                            Text("No team members yet")
                                .foregroundColor(.secondary)
                                .padding()
                        } else {
                            ForEach(player.team) { member in
                                TeamMemberRow(member: member)
                            }
                        }

                        Text("Total Team Cost: \(formatCurrency(player.metrics.teamCost)) /year")
                            .font(.headline)
                            .foregroundColor(.orange)
                    }
                    .padding()
                    .background(Color(NSColor.controlBackgroundColor))
                    .cornerRadius(12)

                    VStack(alignment: .leading, spacing: 12) {
                        Text("Available Candidates")
                            .font(.headline)

                        ForEach(gameViewModel.candidatePool.prefix(10)) { candidate in
                            CandidateRow(candidate: candidate, onHire: {
                                gameViewModel.hireCandidate(playerId: playerId, candidateId: candidate.id)
                            })
                        }
                    }
                    .padding()
                }
                .padding()
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

struct TeamMemberRow: View {
    let member: TeamMember

    var body: some View {
        HStack {
            Image(systemName: member.role.iconName)
                .foregroundColor(.blue)
            VStack(alignment: .leading) {
                Text(member.name)
                    .font(.headline)
                Text("\(member.role.rawValue) - \(member.seniority.rawValue)")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            Spacer()
            Text("$\(Int(member.salaryAnnual))")
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
        .padding()
        .background(Color(NSColor.textBackgroundColor))
        .cornerRadius(8)
    }
}

struct CandidateRow: View {
    let candidate: Candidate
    let onHire: () -> Void

    var body: some View {
        HStack {
            Image(systemName: candidate.role.iconName)
                .foregroundColor(.green)
            VStack(alignment: .leading) {
                Text(candidate.name)
                    .font(.headline)
                Text("\(candidate.role.rawValue) - \(candidate.seniority.rawValue)")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            Spacer()
            Text("$\(Int(candidate.salaryAnnual))")
                .font(.subheadline)
                .foregroundColor(.secondary)
            Button("Hire") {
                onHire()
            }
            .buttonStyle(.borderedProminent)
        }
        .padding()
        .background(Color(NSColor.textBackgroundColor))
        .cornerRadius(8)
    }
}
