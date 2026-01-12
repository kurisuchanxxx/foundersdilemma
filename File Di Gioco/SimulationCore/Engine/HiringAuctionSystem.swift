import Foundation

// MARK: - Hiring Auction System

struct HiringAuctionSystem {

    // MARK: - Auction Resolution

    /// Resolves all active auctions for the current period
    static func resolveAuctions(
        auctions: inout [HiringAuction],
        gameState: GameState,
        candidateCVs: [String: CandidateCV],
        candidatePreferences: [String: CandidatePreferences],
        rng: SeededRandom
    ) -> [AuctionOutcome] {
        var outcomes: [AuctionOutcome] = []

        for i in 0..<auctions.count {
            guard auctions[i].status == .pending else { continue }

            let outcome = resolveAuction(
                auction: &auctions[i],
                gameState: gameState,
                candidateCVs: candidateCVs,
                candidatePreferences: candidatePreferences,
                rng: rng
            )

            outcomes.append(outcome)
        }

        return outcomes
    }

    /// Resolves a single auction
    private static func resolveAuction(
        auction: inout HiringAuction,
        gameState: GameState,
        candidateCVs: [String: CandidateCV],
        candidatePreferences: [String: CandidatePreferences],
        rng: SeededRandom
    ) -> AuctionOutcome {
        auction.status = .evaluating

        guard let candidate = findCandidate(id: auction.candidateId, in: gameState),
              let candidateCV = candidateCVs[auction.candidateId],
              let preferences = candidatePreferences[auction.candidateId]
        else {
            auction.status = .rejected
            auction.rejectionReason = "Candidate not found"
            return AuctionOutcome(
                auctionId: auction.id,
                candidateId: auction.candidateId,
                result: .allRejected(reason: "Candidate not found"),
                scores: [:]
            )
        }

        // Evaluate all offers
        var scores: [String: Double] = [:]

        for (playerId, offer) in auction.offers {
            guard let player = gameState.players.first(where: { $0.id == playerId }) else {
                continue
            }

            let startup = createStartupSnapshot(from: player, gameState: gameState)

            let score = CandidateAI.evaluateOffer(
                candidate: candidate,
                candidateCV: candidateCV,
                preferences: preferences,
                offer: offer,
                startup: startup,
                rng: rng
            )

            scores[playerId] = score
        }

        // Sort offers by score (best first)
        let rankedOffers = scores.sorted { $0.value > $1.value }

        guard let bestOffer = rankedOffers.first else {
            auction.status = .rejected
            auction.rejectionReason = "No valid offers"
            return AuctionOutcome(
                auctionId: auction.id,
                candidateId: auction.candidateId,
                result: .allRejected(reason: "No valid offers"),
                scores: scores
            )
        }

        let threshold = CandidateAI.acceptanceThreshold(
            seniority: candidate.seniority,
            period: auction.period
        )

        // Check if best offer meets threshold
        if bestOffer.value >= threshold {
            // Accept best offer
            auction.status = .accepted
            auction.winnerPlayerId = bestOffer.key

            return AuctionOutcome(
                auctionId: auction.id,
                candidateId: auction.candidateId,
                result: .won(playerId: bestOffer.key),
                scores: scores
            )
        } else {
            // Check if candidate will counter-offer
            if CandidateAI.shouldCounterOffer(
                score: bestOffer.value,
                threshold: threshold,
                seniority: candidate.seniority,
                rng: rng
            ) {
                let (newSalary, newEquity) = CandidateAI.generateCounterOffer(
                    candidate: candidate,
                    originalOffer: auction.offers[bestOffer.key]!,
                    score: bestOffer.value,
                    threshold: threshold,
                    rng: rng
                )

                auction.status = .counterOffer
                auction.rejectionReason = "Counter-offer proposed"

                return AuctionOutcome(
                    auctionId: auction.id,
                    candidateId: auction.candidateId,
                    result: .counterOffer(newSalary: newSalary, newEquity: newEquity),
                    scores: scores,
                    counterOfferPlayerId: bestOffer.key
                )
            } else {
                // Reject all offers
                let player = gameState.players.first { $0.id == bestOffer.key }!
                let startup = createStartupSnapshot(from: player, gameState: gameState)
                let reason = CandidateAI.generateRejectionReason(
                    startup: startup,
                    preferences: preferences,
                    seniority: candidate.seniority,
                    score: bestOffer.value
                )

                auction.status = .rejected
                auction.rejectionReason = reason

                return AuctionOutcome(
                    auctionId: auction.id,
                    candidateId: auction.candidateId,
                    result: .allRejected(reason: reason),
                    scores: scores
                )
            }
        }
    }

    // MARK: - Helper Functions

    private static func findCandidate(id: String, in gameState: GameState) -> Candidate? {
        return gameState.candidatePool.first { $0.id == id }
    }

    private static func createStartupSnapshot(from player: Player, gameState: GameState) -> StartupSnapshot {
        // Calculate average tenure
        let avgTenure = player.team.isEmpty ? 0.0 :
            player.team.reduce(0.0) { $0 + Double($1.tenureYears) } / Double(player.team.count)

        // Determine last funding round (simplified - will be enhanced later)
        var lastRoundType: String? = nil
        if player.metrics.equityOwned < 0.95 {
            // Assume some funding happened
            if player.metrics.cash > 5_000_000 {
                lastRoundType = "Series A"
            } else if player.metrics.cash > 1_000_000 {
                lastRoundType = "Seed"
            } else {
                lastRoundType = "Pre-Seed"
            }
        }

        // Estimate founder stress (will be enhanced later with dedicated metric)
        var founderStress = 0.0
        if player.metrics.runway < 3 {
            founderStress += 0.4
        } else if player.metrics.runway < 6 {
            founderStress += 0.2
        }
        if player.metrics.morale < 0.5 {
            founderStress += 0.3
        }
        if !player.metrics.mvpReady && gameState.currentRound > 3 {
            founderStress += 0.3
        }
        founderStress = min(1.0, founderStress)

        // Estimate PMF score (will be enhanced later with dedicated metric)
        var pmfScore = 0.0
        if player.metrics.mvpReady {
            pmfScore += 30.0
        }
        if player.metrics.customers > 100 {
            pmfScore += 20.0
        }
        if player.metrics.customers > 1000 {
            pmfScore += 20.0
        }
        if player.metrics.churnRate < 0.1 {
            pmfScore += 15.0
        }
        if player.metrics.revenue > 100_000 {
            pmfScore += 15.0
        }

        // Estimate reputation (will be enhanced later with dedicated metric)
        let reputation = min(100.0, (player.metrics.valuation / 50_000_000) * 100)

        return StartupSnapshot(
            playerId: player.id,
            companyName: player.companyName,
            productName: player.productName,
            sector: player.sector.rawValue,
            cash: player.metrics.cash,
            runway: player.metrics.runway,
            burnRate: player.metrics.burnRate,
            revenue: player.metrics.revenue,
            customers: player.metrics.customers,
            pmfScore: pmfScore,
            periodsSinceLaunch: gameState.currentRound,
            headcount: player.metrics.headcount,
            morale: player.metrics.morale,
            averageTenure: avgTenure,
            reputation: reputation,
            valuation: player.metrics.valuation,
            fundingRaised: player.sector.parameters.initialBudget + (1.0 - player.metrics.equityOwned) * player.metrics.valuation,
            lastRoundType: lastRoundType,
            founderStress: founderStress
        )
    }

    // MARK: - Auction Creation

    /// Creates auctions for candidates with multiple offers
    static func createAuctions(
        from hiringDecisions: [String: HiringDecision], // playerId → decision
        candidatePool: [Candidate],
        period: Int
    ) -> [HiringAuction] {
        // Track which candidates have multiple offers
        var candidateOfferCounts: [String: Int] = [:]

        for (_, decision) in hiringDecisions {
            for candidateId in decision.candidateIds {
                candidateOfferCounts[candidateId, default: 0] += 1
            }
        }

        // Create auctions for contested candidates
        var auctions: [HiringAuction] = []

        for (candidateId, offerCount) in candidateOfferCounts where offerCount > 1 {
            let auction = HiringAuction(
                candidateId: candidateId,
                period: period,
                status: .pending
            )
            auctions.append(auction)
        }

        return auctions
    }

    /// Adds offers to existing auctions
    static func addOffersToAuctions(
        auctions: inout [HiringAuction],
        offers: [HiringOffer]
    ) {
        for offer in offers {
            if let index = auctions.firstIndex(where: { $0.candidateId == offer.candidateId }) {
                auctions[index].addOffer(offer)
            }
        }
    }
}

// MARK: - Auction Outcome

struct AuctionOutcome: Codable, Equatable, Identifiable {
    let id: String
    let auctionId: String
    let candidateId: String
    let result: AuctionResult
    let scores: [String: Double] // playerId → score
    var counterOfferPlayerId: String?

    init(
        id: String = UUID().uuidString,
        auctionId: String,
        candidateId: String,
        result: AuctionResult,
        scores: [String: Double],
        counterOfferPlayerId: String? = nil
    ) {
        self.id = id
        self.auctionId = auctionId
        self.candidateId = candidateId
        self.result = result
        self.scores = scores
        self.counterOfferPlayerId = counterOfferPlayerId
    }

    var winnerPlayerId: String? {
        if case .won(let playerId) = result {
            return playerId
        }
        return nil
    }

    var isRejection: Bool {
        if case .allRejected = result {
            return true
        }
        return false
    }

    var isCounterOffer: Bool {
        if case .counterOffer = result {
            return true
        }
        return false
    }
}

// MARK: - Candidate Pool Management

extension HiringAuctionSystem {

    /// Refreshes the candidate pool by removing some and adding new ones
    static func refreshCandidatePool(
        currentPool: [Candidate],
        period: Int,
        hiredCandidateIds: Set<String>,
        rng: SeededRandom
    ) -> [Candidate] {
        var newPool = currentPool

        // Remove hired candidates
        newPool.removeAll { hiredCandidateIds.contains($0.id) }

        // Remove some random candidates (market dynamics)
        let removeCount = min(newPool.count, rng.nextInt(min: 3, max: 8))
        for _ in 0..<removeCount {
            if !newPool.isEmpty {
                let randomIndex = rng.nextInt(min: 0, max: newPool.count - 1)
                newPool.remove(at: randomIndex)
            }
        }

        // Add new candidates (would call CandidateGenerator here - placeholder for now)
        // let newCandidates = CandidateGenerator.generate(count: removeCount, period: period, rng: rng)
        // newPool.append(contentsOf: newCandidates)

        return newPool
    }

    /// Filters candidate pool based on availability and player budget
    static func getAvailableCandidates(
        from pool: [Candidate],
        excludingHired: Set<String>,
        playerCash: Double,
        period: Int
    ) -> [Candidate] {
        return pool.filter { candidate in
            // Not already hired
            guard !excludingHired.contains(candidate.id) else {
                return false
            }

            // Player can afford at least minimum salary for 2 periods
            let minSalary = candidate.seniority.quarterlySalaryRange.min
            let twoPeriodsBuffer = minSalary * 2

            return playerCash >= twoPeriodsBuffer
        }
    }
}
