import Foundation
import SwiftUI

enum GameScreen {
    case setup
    case game
}

@MainActor
final class GameViewModel: ObservableObject {
    @Published var gameState: GameState?
    @Published var currentScreen: GameScreen = .setup
    @Published var selectedPlayerId: String?
    @Published var transport: LocalTransport?
    @Published var simulationEngine: SimulationEngine?

    @Published var candidatePool: [Candidate] = []

    init() {
        loadCandidates()
    }

    func startNewGame(config: GameConfig, players: [Player]) {
        var state = GameState(config: config, players: players, candidatePool: candidatePool)
        self.gameState = state
        self.transport = LocalTransport(gameState: state)
        self.simulationEngine = SimulationEngine(seed: config.seed)
        self.currentScreen = .game

        if config.mode == .soloVsBot {
            self.selectedPlayerId = players.first { $0.type == .human }?.id
        }
    }

    func submitDecision(playerId: String, decision: Decision) {
        guard var state = gameState else { return }

        if let index = state.players.firstIndex(where: { $0.id == playerId }) {
            state.players[index].currentDecision = decision
            state.players[index].isReady = true
        }

        transport?.updateState(state)
        self.gameState = state

        if state.config.mode == .soloVsBot {
            generateBotDecisions()
        }
    }

    func advanceYear() {
        guard var state = gameState, var engine = simulationEngine else { return }

        engine.simulateRound(gameState: &state)
        state.advanceRound()

        transport?.updateState(state)
        self.gameState = state
    }

    func acceptExit(playerId: String) {
        guard var state = gameState else { return }
        if let index = state.players.firstIndex(where: { $0.id == playerId }) {
            state.players[index].metrics.exitAccepted = true
            state.players[index].metrics.exitYear = state.currentYear
        }
        self.gameState = state
    }

    func hireCandidate(playerId: String, candidateId: String) {
        guard var state = gameState else { return }
        guard let candidate = candidatePool.first(where: { $0.id == candidateId }) else { return }

        if let index = state.players.firstIndex(where: { $0.id == playerId }) {
            let member = candidate.toTeamMember()
            state.players[index].team.append(member)
        }

        self.gameState = state
    }

    func fireTeamMember(playerId: String, memberId: String) {
        guard var state = gameState else { return }
        if let index = state.players.firstIndex(where: { $0.id == playerId }) {
            state.players[index].team.removeAll { $0.id == memberId }
        }
        self.gameState = state
    }

    private func generateBotDecisions() {
        guard var state = gameState else { return }
        let botPlayers = state.players.filter { $0.type == .bot && !$0.isReady }

        for bot in botPlayers {
            if let index = state.players.firstIndex(where: { $0.id == bot.id }) {
                let decision = BotAI.generateDecision(for: bot, year: state.currentYear)
                state.players[index].currentDecision = decision
                state.players[index].isReady = true
            }
        }

        transport?.updateState(state)
        self.gameState = state
    }

    private func loadCandidates() {
        guard let url = Bundle.main.url(forResource: "candidates", withExtension: "json") else {
            print("candidates.json not found")
            return
        }

        do {
            let data = try Data(contentsOf: url)
            let decoder = JSONDecoder()
            candidatePool = try decoder.decode([Candidate].self, from: data)
        } catch {
            print("Error loading candidates: \(error)")
        }
    }
}
