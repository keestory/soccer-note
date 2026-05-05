import Foundation
import SwiftData

@Model
final class FitnessSession {
    var id: UUID
    var startTime: Date
    var endTime: Date?
    var positionRaw: String
    var isMatch: Bool

    // Metrics
    var totalDistance: Double // meters
    var sprintDistance: Double // meters
    var sprintCount: Int
    var averageHeartRate: Double
    var maxHeartRate: Double
    var activeCalories: Double
    var averageSpeed: Double // m/s
    var maxSpeed: Double // m/s

    // Quarter tracking
    var currentQuarter: Int
    var quarterDistances: [Double] // distance per quarter in meters

    // SoccerNote sync
    var matchId: String? // UUID of match in SoccerNote
    var playerId: String? // UUID of player in SoccerNote
    var teamId: String? // UUID of team in SoccerNote
    var syncedToServer: Bool

    var position: Position {
        get { Position(rawValue: positionRaw) ?? .centralMidfielder }
        set { positionRaw = newValue.rawValue }
    }

    var totalDistanceKm: Double {
        totalDistance / 1000.0
    }

    var sprintDistanceKm: Double {
        sprintDistance / 1000.0
    }

    var sprintPercentage: Double {
        guard totalDistance > 0 else { return 0 }
        return sprintDistance / totalDistance
    }

    var duration: TimeInterval {
        guard let endTime = endTime else {
            return Date().timeIntervalSince(startTime)
        }
        return endTime.timeIntervalSince(startTime)
    }

    var durationMinutes: Int {
        Int(duration / 60)
    }

    init(
        position: Position,
        isMatch: Bool,
        matchId: String? = nil,
        playerId: String? = nil,
        teamId: String? = nil
    ) {
        self.id = UUID()
        self.startTime = Date()
        self.endTime = nil
        self.positionRaw = position.rawValue
        self.isMatch = isMatch

        self.totalDistance = 0
        self.sprintDistance = 0
        self.sprintCount = 0
        self.averageHeartRate = 0
        self.maxHeartRate = 0
        self.activeCalories = 0
        self.averageSpeed = 0
        self.maxSpeed = 0

        self.currentQuarter = 1
        self.quarterDistances = [0, 0, 0, 0]

        self.matchId = matchId
        self.playerId = playerId
        self.teamId = teamId
        self.syncedToServer = false
    }
}

// For API sync
struct FitnessSessionSync: Codable {
    let id: String
    let player_id: String
    let match_id: String?
    let team_id: String
    let position: String
    let is_match: Bool
    let start_time: String
    let end_time: String
    let total_distance_meters: Double
    let sprint_distance_meters: Double
    let sprint_count: Int
    let average_heart_rate: Double
    let max_heart_rate: Double
    let active_calories: Double
    let average_speed: Double
    let max_speed: Double
    let quarter_distances: [Double]

    static func from(session: FitnessSession) -> FitnessSessionSync? {
        guard let playerId = session.playerId,
              let teamId = session.teamId,
              let endTime = session.endTime else {
            return nil
        }

        let formatter = ISO8601DateFormatter()

        return FitnessSessionSync(
            id: session.id.uuidString,
            player_id: playerId,
            match_id: session.matchId,
            team_id: teamId,
            position: session.position.soccerNoteType,
            is_match: session.isMatch,
            start_time: formatter.string(from: session.startTime),
            end_time: formatter.string(from: endTime),
            total_distance_meters: session.totalDistance,
            sprint_distance_meters: session.sprintDistance,
            sprint_count: session.sprintCount,
            average_heart_rate: session.averageHeartRate,
            max_heart_rate: session.maxHeartRate,
            active_calories: session.activeCalories,
            average_speed: session.averageSpeed,
            max_speed: session.maxSpeed,
            quarter_distances: session.quarterDistances
        )
    }
}
