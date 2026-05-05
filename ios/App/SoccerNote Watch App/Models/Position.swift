import Foundation

// SoccerNote uses: GK, DF, MF, FW
// We extend with more specific positions for detailed tracking
enum Position: String, CaseIterable, Identifiable, Codable {
    case goalkeeper = "GK"
    case centerBack = "CB"
    case fullBack = "FB"
    case defensiveMidfielder = "CDM"
    case centralMidfielder = "CM"
    case attackingMidfielder = "CAM"
    case winger = "WG"
    case striker = "ST"

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .goalkeeper: return "골키퍼"
        case .centerBack: return "센터백"
        case .fullBack: return "풀백"
        case .defensiveMidfielder: return "수비형 미드필더"
        case .centralMidfielder: return "중앙 미드필더"
        case .attackingMidfielder: return "공격형 미드필더"
        case .winger: return "윙어"
        case .striker: return "스트라이커"
        }
    }

    var shortName: String {
        switch self {
        case .goalkeeper: return "GK"
        case .centerBack: return "CB"
        case .fullBack: return "FB"
        case .defensiveMidfielder: return "CDM"
        case .centralMidfielder: return "CM"
        case .attackingMidfielder: return "CAM"
        case .winger: return "WG"
        case .striker: return "ST"
        }
    }

    var emoji: String {
        switch self {
        case .goalkeeper: return "🧤"
        case .centerBack: return "🛡️"
        case .fullBack: return "🏃"
        case .defensiveMidfielder: return "⚔️"
        case .centralMidfielder: return "🎯"
        case .attackingMidfielder: return "✨"
        case .winger: return "💨"
        case .striker: return "⚽"
        }
    }

    // Map to SoccerNote's position_type
    var soccerNoteType: String {
        switch self {
        case .goalkeeper: return "GK"
        case .centerBack, .fullBack: return "DF"
        case .defensiveMidfielder, .centralMidfielder, .attackingMidfielder: return "MF"
        case .winger, .striker: return "FW"
        }
    }

    var benchmark: PositionBenchmark {
        // Amateur team: 25 minutes per quarter
        switch self {
        case .goalkeeper:
            return PositionBenchmark(
                minDistance: 3.5, maxDistance: 4.5,
                distancePerQuarter: 1.0,
                sprintPercentage: 0.05,
                intensity: .low,
                expectedHeartRateZone: .fatBurn
            )
        case .centerBack:
            return PositionBenchmark(
                minDistance: 6.0, maxDistance: 7.5,
                distancePerQuarter: 1.7,
                sprintPercentage: 0.08,
                intensity: .medium,
                expectedHeartRateZone: .cardio
            )
        case .fullBack:
            return PositionBenchmark(
                minDistance: 7.0, maxDistance: 9.0,
                distancePerQuarter: 2.0,
                sprintPercentage: 0.15,
                intensity: .high,
                expectedHeartRateZone: .cardio
            )
        case .defensiveMidfielder:
            return PositionBenchmark(
                minDistance: 7.5, maxDistance: 9.0,
                distancePerQuarter: 2.0,
                sprintPercentage: 0.10,
                intensity: .mediumHigh,
                expectedHeartRateZone: .cardio
            )
        case .centralMidfielder:
            return PositionBenchmark(
                minDistance: 7.5, maxDistance: 9.5,
                distancePerQuarter: 2.1,
                sprintPercentage: 0.12,
                intensity: .high,
                expectedHeartRateZone: .cardio
            )
        case .attackingMidfielder:
            return PositionBenchmark(
                minDistance: 7.0, maxDistance: 8.5,
                distancePerQuarter: 1.9,
                sprintPercentage: 0.15,
                intensity: .high,
                expectedHeartRateZone: .cardio
            )
        case .winger:
            return PositionBenchmark(
                minDistance: 7.0, maxDistance: 8.5,
                distancePerQuarter: 1.9,
                sprintPercentage: 0.20,
                intensity: .veryHigh,
                expectedHeartRateZone: .peak
            )
        case .striker:
            return PositionBenchmark(
                minDistance: 6.0, maxDistance: 7.5,
                distancePerQuarter: 1.7,
                sprintPercentage: 0.18,
                intensity: .mediumHigh,
                expectedHeartRateZone: .cardio
            )
        }
    }
}

struct PositionBenchmark {
    let minDistance: Double // km for full match
    let maxDistance: Double // km for full match
    let distancePerQuarter: Double // km per 25 min quarter
    let sprintPercentage: Double // 0.0 - 1.0
    let intensity: Intensity
    let expectedHeartRateZone: HeartRateZone

    var targetDistance: Double {
        (minDistance + maxDistance) / 2
    }

    var targetDistancePerQuarter: Double {
        distancePerQuarter
    }
}

enum Intensity: String, Codable {
    case low = "낮음"
    case medium = "보통"
    case mediumHigh = "중상"
    case high = "높음"
    case veryHigh = "매우 높음"
}

enum HeartRateZone: String, Codable {
    case recovery = "회복"
    case fatBurn = "지방연소"
    case cardio = "유산소"
    case peak = "최대"

    var range: ClosedRange<Int> {
        switch self {
        case .recovery: return 50...60
        case .fatBurn: return 60...70
        case .cardio: return 70...85
        case .peak: return 85...100
        }
    }
}
