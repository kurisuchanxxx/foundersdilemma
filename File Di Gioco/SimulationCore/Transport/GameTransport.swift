import Foundation

protocol GameTransport {
    func sendDecision(playerId: String, decision: Decision)
    func sendReady(playerId: String)
    func syncState() -> GameState?
    func isAllReady() -> Bool
}
