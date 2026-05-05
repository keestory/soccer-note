import Foundation

actor SupabaseService {
    static let shared = SupabaseService()

    // SoccerNote Supabase configuration
    private let supabaseUrl = "https://qfbfkgbqmeqgwnbdphlm.supabase.co"
    private let supabaseAnonKey = "sb_publishable_NlbtwokGg1k_zE65CGBVqA_y2KFchrD"

    private var authToken: String?

    func setAuthToken(_ token: String) {
        self.authToken = token
    }

    // MARK: - Sync Fitness Session

    func syncFitnessSession(_ session: FitnessSessionSync) async throws {
        let url = URL(string: "\(supabaseUrl)/rest/v1/fitness_sessions")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(supabaseAnonKey, forHTTPHeaderField: "apikey")

        if let token = authToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        let encoder = JSONEncoder()
        request.httpBody = try encoder.encode(session)

        let (_, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw SyncError.uploadFailed
        }
    }

    // MARK: - Get Player Info

    func getMyPlayerInfo() async throws -> PlayerInfo? {
        guard let token = authToken else {
            throw SyncError.notAuthenticated
        }

        // Get current user's profile
        let profileUrl = URL(string: "\(supabaseUrl)/rest/v1/profiles?select=*")!
        var request = URLRequest(url: profileUrl)
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(supabaseAnonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        let (data, _) = try await URLSession.shared.data(for: request)

        let profiles = try JSONDecoder().decode([ProfileResponse].self, from: data)
        guard let profile = profiles.first else {
            return nil
        }

        // Find linked player
        let playerUrl = URL(string: "\(supabaseUrl)/rest/v1/players?linked_user_id=eq.\(profile.id)&select=*,teams(*)")!
        var playerRequest = URLRequest(url: playerUrl)
        playerRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        playerRequest.setValue(supabaseAnonKey, forHTTPHeaderField: "apikey")
        playerRequest.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        let (playerData, _) = try await URLSession.shared.data(for: playerRequest)
        let players = try JSONDecoder().decode([PlayerResponse].self, from: playerData)

        guard let player = players.first else {
            return nil
        }

        return PlayerInfo(
            playerId: player.id,
            teamId: player.team_id,
            name: player.name,
            number: player.number,
            position: player.default_position,
            teamName: player.teams?.name
        )
    }

    // MARK: - Get Upcoming Matches

    func getUpcomingMatches(teamId: String) async throws -> [MatchInfo] {
        let today = ISO8601DateFormatter().string(from: Date()).prefix(10)
        let url = URL(string: "\(supabaseUrl)/rest/v1/matches?team_id=eq.\(teamId)&match_date=gte.\(today)&order=match_date.asc&limit=5")!

        var request = URLRequest(url: url)
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(supabaseAnonKey, forHTTPHeaderField: "apikey")

        if let token = authToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        let (data, _) = try await URLSession.shared.data(for: request)
        let matches = try JSONDecoder().decode([MatchResponse].self, from: data)

        return matches.map { match in
            MatchInfo(
                id: match.id,
                opponent: match.opponent,
                matchDate: match.match_date,
                location: match.location
            )
        }
    }
}

// MARK: - Response Models

struct ProfileResponse: Codable {
    let id: String
    let email: String
    let display_name: String?
}

struct PlayerResponse: Codable {
    let id: String
    let team_id: String
    let name: String
    let number: Int?
    let default_position: String?
    let teams: TeamResponse?
}

struct TeamResponse: Codable {
    let id: String
    let name: String
}

struct MatchResponse: Codable {
    let id: String
    let opponent: String
    let match_date: String
    let location: String?
}

// MARK: - App Models

struct PlayerInfo {
    let playerId: String
    let teamId: String
    let name: String
    let number: Int?
    let position: String?
    let teamName: String?
}

struct MatchInfo: Identifiable {
    let id: String
    let opponent: String
    let matchDate: String
    let location: String?
}

// MARK: - Errors

enum SyncError: Error {
    case notAuthenticated
    case uploadFailed
    case networkError
}
