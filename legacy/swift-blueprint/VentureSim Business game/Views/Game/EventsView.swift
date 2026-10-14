import SwiftUI

struct EventsView: View {
    @EnvironmentObject var gameViewModel: GameViewModel

    var body: some View {
        ScrollView {
            if let state = gameViewModel.gameState {
                VStack(spacing: 24) {
                    Text("Events")
                        .font(.title)
                        .fontWeight(.bold)

                    if state.events.isEmpty {
                        Text("No events yet")
                            .foregroundColor(.secondary)
                            .padding()
                    } else {
                        ForEach(state.events.reversed()) { event in
                            EventCard(event: event)
                        }
                    }
                }
                .padding()
            }
        }
    }
}

struct EventCard: View {
    let event: Event

    var body: some View {
        HStack(alignment: .top, spacing: 16) {
            Image(systemName: iconForEvent)
                .font(.title2)
                .foregroundColor(colorForEvent)

            VStack(alignment: .leading, spacing: 8) {
                Text(event.title)
                    .font(.headline)
                Text(event.description)
                    .font(.body)
                    .foregroundColor(.secondary)
                Text("Year \((event.year + 1) / 2) - \(event.type.rawValue)")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Spacer()
        }
        .padding()
        .background(Color(NSColor.controlBackgroundColor))
        .cornerRadius(12)
    }

    private var iconForEvent: String {
        switch event.impact {
        case .positive: return "arrow.up.circle.fill"
        case .negative: return "arrow.down.circle.fill"
        case .neutral: return "minus.circle.fill"
        }
    }

    private var colorForEvent: Color {
        switch event.impact {
        case .positive: return .green
        case .negative: return .red
        case .neutral: return .orange
        }
    }
}
