import SwiftUI

struct DecisionsView: View {
    @EnvironmentObject var gameViewModel: GameViewModel
    @State private var rndSpend: Double = 50000
    @State private var marketingSpend: Double = 60000
    @State private var opsSpend: Double = 20000
    @State private var mvpMonths: Int = 6
    @State private var pricing: Double = 10000
    @State private var gtmFocus: GTMFocus = .performance

    var body: some View {
        ScrollView {
            if let state = gameViewModel.gameState,
               let playerId = gameViewModel.selectedPlayerId,
               let player = state.players.first(where: { $0.id == playerId }) {
                VStack(spacing: 24) {
                    Text("Decisions for \(state.roundLabel)")
                        .font(.title)
                        .fontWeight(.bold)

                    VStack(alignment: .leading, spacing: 16) {
                        SliderInput(title: "R&D Spend", value: $rndSpend, range: 0...200_000, format: "currency")
                        SliderInput(title: "Marketing Spend", value: $marketingSpend, range: 0...200_000, format: "currency")
                        SliderInput(title: "Operations Spend", value: $opsSpend, range: 0...100_000, format: "currency")

                        VStack(alignment: .leading, spacing: 8) {
                            Text("MVP Development Months")
                                .font(.headline)
                            Stepper(value: $mvpMonths, in: 1...12) {
                                Text("\(mvpMonths) months")
                            }
                        }

                        SliderInput(title: "Pricing (ARPA)", value: $pricing, range: 100...50_000, format: "currency")

                        VStack(alignment: .leading, spacing: 8) {
                            Text("GTM Focus")
                                .font(.headline)
                            Picker("", selection: $gtmFocus) {
                                ForEach(GTMFocus.allCases, id: \.self) { focus in
                                    Text(focus.rawValue).tag(focus)
                                }
                            }
                            .pickerStyle(.segmented)
                        }

                        Button(action: submitDecision) {
                            Text(player.isReady ? "Decision Submitted ✓" : "Submit Decision")
                                .font(.headline)
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(player.isReady ? Color.green : Color.accentColor)
                                .foregroundColor(.white)
                                .cornerRadius(12)
                        }
                        .disabled(player.isReady)
                    }
                    .padding()
                }
                .padding()
            }
        }
    }

    private func submitDecision() {
        guard let playerId = gameViewModel.selectedPlayerId else { return }

        let decision = Decision(
            spendRnD: rndSpend,
            spendMarketing: marketingSpend,
            spendOperations: opsSpend,
            mvpDevelopmentMonths: mvpMonths,
            pricing: pricing,
            gtmFocus: gtmFocus,
            hiring: HiringDecision(candidateIds: [], firings: []),
            raiseRound: nil,
            acceptExit: false
        )

        gameViewModel.submitDecision(playerId: playerId, decision: decision)
    }
}

struct SliderInput: View {
    let title: String
    @Binding var value: Double
    let range: ClosedRange<Double>
    let format: String

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(title)
                    .font(.headline)
                Spacer()
                Text(formattedValue)
                    .foregroundColor(.secondary)
            }
            Slider(value: $value, in: range)
        }
    }

    private var formattedValue: String {
        if format == "currency" {
            let formatter = NumberFormatter()
            formatter.numberStyle = .currency
            formatter.maximumFractionDigits = 0
            return formatter.string(from: NSNumber(value: value)) ?? "$0"
        }
        return "\(Int(value))"
    }
}
