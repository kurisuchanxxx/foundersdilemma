import Foundation

struct EventGenerator {
    private static let globalEventTemplates: [EventTemplate] = [
        EventTemplate(
            type: .global,
            impact: .negative,
            title: "Market Downturn",
            description: "Investor sentiment turns bearish. Fundraising becomes harder, CAC increases.",
            effects: Event.EventEffects(cacMultiplier: 1.3, ltvMultiplier: 0.9),
            probability: 0.3,
            requiresMVP: false
        ),
        EventTemplate(
            type: .global,
            impact: .positive,
            title: "Tech Boom",
            description: "Your sector is hot! Easier to raise, lower CAC, higher valuations.",
            effects: Event.EventEffects(cacMultiplier: 0.8, ltvMultiplier: 1.2),
            probability: 0.2,
            requiresMVP: false
        ),
        EventTemplate(
            type: .global,
            impact: .neutral,
            title: "New Regulation",
            description: "Industry regulation changes. Compliance costs rise slightly.",
            effects: Event.EventEffects(cashDelta: -20_000),
            probability: 0.25,
            requiresMVP: false
        ),
        EventTemplate(
            type: .global,
            impact: .negative,
            title: "Major Competitor Launch",
            description: "A well-funded competitor enters your space. CAC increases, churn rises.",
            effects: Event.EventEffects(cacMultiplier: 1.4, churnDelta: 0.05),
            probability: 0.3,
            requiresMVP: true
        ),
        EventTemplate(
            type: .global,
            impact: .positive,
            title: "Industry Tailwind",
            description: "Your sector sees accelerated growth. Customer acquisition becomes easier.",
            effects: Event.EventEffects(cacMultiplier: 0.7),
            probability: 0.2,
            requiresMVP: false
        )
    ]

    private static let playerEventTemplates: [EventTemplate] = [
        EventTemplate(
            type: .player,
            impact: .positive,
            title: "Viral Moment",
            description: "Your product gets featured on social media. Free users flood in!",
            effects: Event.EventEffects(cacMultiplier: 0.5, revenueDelta: 50_000),
            probability: 0.15,
            requiresMVP: true
        ),
        EventTemplate(
            type: .player,
            impact: .positive,
            title: "Strategic Partnership",
            description: "A major player wants to partner. Revenue boost and credibility gain.",
            effects: Event.EventEffects(revenueDelta: 100_000, ltvMultiplier: 1.3),
            probability: 0.2,
            requiresMVP: true
        ),
        EventTemplate(
            type: .player,
            impact: .negative,
            title: "Security Breach",
            description: "A data leak damages your reputation. Customer trust drops.",
            effects: Event.EventEffects(cashDelta: -80_000, churnDelta: 0.1, moraleMultiplier: 0.8),
            probability: 0.1,
            requiresMVP: true
        ),
        EventTemplate(
            type: .player,
            impact: .negative,
            title: "Key Customer Churns",
            description: "Your biggest customer leaves. Revenue takes a hit.",
            effects: Event.EventEffects(revenueDelta: -50_000, churnDelta: 0.05),
            probability: 0.2,
            requiresMVP: true
        ),
        EventTemplate(
            type: .player,
            impact: .positive,
            title: "Award Recognition",
            description: "You win 'Startup of the Year'. Brand boost and easier recruiting.",
            effects: Event.EventEffects(cacMultiplier: 0.8, moraleMultiplier: 1.2),
            probability: 0.1,
            requiresMVP: true
        ),
        EventTemplate(
            type: .player,
            impact: .negative,
            title: "Product Outage",
            description: "Critical downtime damages customer trust and slows growth.",
            effects: Event.EventEffects(churnDelta: 0.08, moraleMultiplier: 0.9),
            probability: 0.15,
            requiresMVP: true
        )
    ]

    private static let teamEventTemplates: [EventTemplate] = [
        EventTemplate(
            type: .team,
            impact: .negative,
            title: "Team Member Burnout",
            description: "A key team member is burned out and needs time off.",
            effects: Event.EventEffects(moraleMultiplier: 0.85),
            probability: 0.2,
            requiresMVP: false
        ),
        EventTemplate(
            type: .team,
            impact: .negative,
            title: "Resignation",
            description: "A team member quits unexpectedly. Knowledge loss and morale hit.",
            effects: Event.EventEffects(moraleMultiplier: 0.8),
            probability: 0.15,
            requiresMVP: false
        ),
        EventTemplate(
            type: .team,
            impact: .positive,
            title: "Team Bonding Win",
            description: "Your team gels beautifully. Morale and execution improve.",
            effects: Event.EventEffects(moraleMultiplier: 1.15),
            probability: 0.2,
            requiresMVP: false
        )
    ]

    static func generateGlobalEvent(year: Int, rng: SeededRandom, mvpReady: Bool) -> Event? {
        let validTemplates = globalEventTemplates.filter { !$0.requiresMVP || mvpReady }
        guard !validTemplates.isEmpty else { return nil }

        if rng.nextDouble() < 0.6 {
            if let template = rng.randomElement(from: validTemplates) {
                return template.toEvent(year: year)
            }
        }
        return nil
    }

    static func generatePlayerEvents(
        playerId: String,
        year: Int,
        riskLevel: RiskLevel,
        mvpReady: Bool,
        rng: SeededRandom
    ) -> [Event] {
        var events: [Event] = []
        let validTemplates = playerEventTemplates.filter { !$0.requiresMVP || mvpReady }
        guard !validTemplates.isEmpty else { return events }

        let riskMultiplier = riskLevel.eventProbabilityMultiplier
        let maxEvents = rng.nextInt(min: 0, max: 2)

        for _ in 0..<maxEvents {
            let roll = rng.nextDouble()
            if roll < (0.3 * riskMultiplier) {
                if let template = rng.randomElement(from: validTemplates) {
                    events.append(template.toEvent(year: year, playerId: playerId))
                }
            }
        }

        return events
    }

    static func generateTeamEvents(
        playerId: String,
        year: Int,
        team: [TeamMember],
        rng: SeededRandom
    ) -> [Event] {
        var events: [Event] = []
        guard !team.isEmpty else { return events }

        for template in teamEventTemplates {
            if rng.nextDouble() < template.probability {
                var event = template.toEvent(year: year, playerId: playerId)

                if template.title.contains("Resignation") || template.title.contains("Burnout") {
                    if let member = rng.randomElement(from: team) {
                        if template.title.contains("Resignation") {
                            event.effects.teamMemberResignation = member.id
                        } else {
                            event.effects.teamMemberBurnout = member.id
                        }
                    }
                }

                events.append(event)
            }
        }

        return events
    }
}
