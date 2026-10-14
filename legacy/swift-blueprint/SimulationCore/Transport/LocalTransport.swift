import Foundation

final class LocalTransport: GameTransport {
    private var gameState: GameState

    init(gameState: GameState) {
        self.gameState = gameState
    }

    func sendDecision(playerId: String, decision: Decision) {
        if let index = gameState.players.firstIndex(where: { $0.id == playerId }) {
            gameState.players[index].currentDecision = decision
        }
    }

    func sendReady(playerId: String) {
        if let index = gameState.players.firstIndex(where: { $0.id == playerId }) {
            gameState.players[index].isReady = true
        }
    }

    func syncState() -> GameState? {
        return gameState
    }

    func isAllReady() -> Bool {
        return gameState.isAllPlayersReady
    }

    func updateState(_ newState: GameState) {
        self.gameState = newState
    }
}
