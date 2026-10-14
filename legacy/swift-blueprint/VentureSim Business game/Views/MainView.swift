import SwiftUI

struct MainView: View {
    @EnvironmentObject var gameViewModel: GameViewModel

    var body: some View {
        Group {
            switch gameViewModel.currentScreen {
            case .setup:
                GameSetupView()
            case .game:
                GameRootView()
            }
        }
    }
}

struct GameRootView: View {
    @EnvironmentObject var gameViewModel: GameViewModel
    @State private var selectedTab: GameTab = .dashboard

    enum GameTab: String, CaseIterable {
        case dashboard = "Dashboard"
        case decisions = "Decisions"
        case team = "Team"
        case events = "Events"
        case leaderboard = "Leaderboard"
        case settings = "Settings"

        var iconName: String {
            switch self {
            case .dashboard: return "chart.bar.fill"
            case .decisions: return "slider.horizontal.3"
            case .team: return "person.3.fill"
            case .events: return "calendar.badge.exclamationmark"
            case .leaderboard: return "trophy.fill"
            case .settings: return "gearshape.fill"
            }
        }
    }

    var body: some View {
        NavigationSplitView {
            List(GameTab.allCases, id: \.self, selection: $selectedTab) { tab in
                Label(tab.rawValue, systemImage: tab.iconName)
                    .tag(tab)
            }
            .navigationTitle("VentureSim")
            .frame(minWidth: 200)
        } detail: {
            Group {
                switch selectedTab {
                case .dashboard:
                    DashboardView()
                case .decisions:
                    DecisionsView()
                case .team:
                    TeamView()
                case .events:
                    EventsView()
                case .leaderboard:
                    LeaderboardView()
                case .settings:
                    SettingsView()
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
    }
}
