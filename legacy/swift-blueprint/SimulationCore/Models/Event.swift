import Foundation

enum EventType: String, Codable {
    case global = "Global"
    case player = "Player"
    case team = "Team"
    case custom = "Custom"
}

enum EventImpact: String, Codable {
    case positive = "Positive"
    case negative = "Negative"
    case neutral = "Neutral"
}

struct Event: Codable, Identifiable, Equatable {
    let id: String
    let type: EventType
    let impact: EventImpact
    let title: String
    let description: String
    let year: Int
    let playerId: String?
    let effects: EventEffects

    struct EventEffects: Codable, Equatable {
        var cashDelta: Double?
        var cacMultiplier: Double?
        var ltvMultiplier: Double?
        var churnDelta: Double?
        var revenueDelta: Double?
        var moraleMultiplier: Double?
        var teamMemberResignation: String?
        var teamMemberBurnout: String?
    }

    init(
        id: String = UUID().uuidString,
        type: EventType,
        impact: EventImpact,
        title: String,
        description: String,
        year: Int,
        playerId: String? = nil,
        effects: EventEffects = EventEffects()
    ) {
        self.id = id
        self.type = type
        self.impact = impact
        self.title = title
        self.description = description
        self.year = year
        self.playerId = playerId
        self.effects = effects
    }
}

struct EventTemplate {
    let type: EventType
    let impact: EventImpact
    let title: String
    let description: String
    let effects: Event.EventEffects
    let probability: Double
    let requiresMVP: Bool

    func toEvent(year: Int, playerId: String? = nil) -> Event {
        Event(
            type: type,
            impact: impact,
            title: title,
            description: description,
            year: year,
            playerId: playerId,
            effects: effects
        )
    }
}
