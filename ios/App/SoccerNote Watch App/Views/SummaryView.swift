import SwiftUI
import SwiftData

struct SummaryView: View {
    let session: FitnessSession
    @Environment(\.dismiss) private var dismiss

    private var rating: PerformanceRating {
        PerformanceRating.calculate(for: session)
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                // Rating circle
                ZStack {
                    Circle()
                        .stroke(ratingColor.opacity(0.3), lineWidth: 8)
                        .frame(width: 60, height: 60)

                    Circle()
                        .trim(from: 0, to: rating.score / 10.0)
                        .stroke(ratingColor, style: StrokeStyle(lineWidth: 8, lineCap: .round))
                        .frame(width: 60, height: 60)
                        .rotationEffect(.degrees(-90))

                    VStack(spacing: 0) {
                        Text(String(format: "%.1f", rating.score))
                            .font(.title3)
                            .fontWeight(.bold)
                        Text("점")
                            .font(.caption2)
                    }
                }

                // Position & time
                HStack {
                    Text("\(session.position.emoji) \(session.position.shortName)")
                        .font(.caption)
                    Text("\(session.durationMinutes)분")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                // Stats
                VStack(spacing: 6) {
                    StatRow(label: "거리", value: String(format: "%.2f km", session.totalDistanceKm))
                    StatRow(label: "스프린트", value: "\(session.sprintCount)회")
                    StatRow(label: "평균 심박수", value: "\(Int(session.averageHeartRate)) BPM")
                    StatRow(label: "최고 속도", value: String(format: "%.1f km/h", session.maxSpeed * 3.6))
                    StatRow(label: "칼로리", value: "\(Int(session.activeCalories)) kcal")
                }
                .padding(.horizontal, 8)

                // Recommendation
                Text(rating.recommendation)
                    .font(.caption2)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 8)

                // Done button
                Button("완료") {
                    dismiss()
                }
                .buttonStyle(.borderedProminent)
                .tint(.green)
            }
            .padding(.vertical, 8)
        }
        .navigationBarBackButtonHidden(true)
    }

    private var ratingColor: Color {
        switch rating.score {
        case 8...10: return .green
        case 6..<8: return .yellow
        case 4..<6: return .orange
        default: return .red
        }
    }
}

struct StatRow: View {
    let label: String
    let value: String

    var body: some View {
        HStack {
            Text(label)
                .font(.caption2)
                .foregroundColor(.secondary)
            Spacer()
            Text(value)
                .font(.caption)
                .fontWeight(.medium)
        }
    }
}

// Performance Rating calculation
struct PerformanceRating {
    let score: Double
    let recommendation: String

    static func calculate(for session: FitnessSession) -> PerformanceRating {
        let benchmark = session.position.benchmark
        var score: Double = 5.0

        // Distance score (40%)
        let distanceRatio = session.totalDistanceKm / benchmark.targetDistance
        let distanceScore = min(distanceRatio * 10, 10) * 0.4

        // Sprint score (30%)
        let sprintRatio = session.sprintPercentage / benchmark.sprintPercentage
        let sprintScore = min(sprintRatio * 10, 10) * 0.3

        // Heart rate zone score (30%)
        let avgHR = session.averageHeartRate
        let expectedZone = benchmark.expectedHeartRateZone
        var hrScore: Double = 5.0

        // Assume max HR of 200 for percentage calculation
        let hrPercentage = (avgHR / 200) * 100
        if expectedZone.range.contains(Int(hrPercentage)) {
            hrScore = 10.0
        } else {
            let zoneMiddle = Double(expectedZone.range.lowerBound + expectedZone.range.upperBound) / 2
            let diff = abs(hrPercentage - zoneMiddle)
            hrScore = max(0, 10 - diff / 5)
        }
        let heartRateScore = hrScore * 0.3

        score = distanceScore + sprintScore + heartRateScore

        // Generate recommendation
        let recommendation = generateRecommendation(
            for: session.position,
            distanceRatio: distanceRatio,
            sprintRatio: sprintRatio
        )

        return PerformanceRating(score: score, recommendation: recommendation)
    }

    private static func generateRecommendation(
        for position: Position,
        distanceRatio: Double,
        sprintRatio: Double
    ) -> String {
        if distanceRatio < 0.8 {
            switch position {
            case .goalkeeper:
                return "골라인 수비 범위를 넓혀보세요"
            case .centerBack, .fullBack:
                return "더 적극적인 빌드업 참여가 필요합니다"
            case .defensiveMidfielder, .centralMidfielder:
                return "더 넓은 지역을 커버해보세요"
            case .attackingMidfielder, .winger:
                return "공격과 수비 전환시 더 빠르게 움직여보세요"
            case .striker:
                return "더 활발한 움직임으로 공간을 만들어보세요"
            }
        } else if sprintRatio < 0.8 {
            switch position {
            case .goalkeeper:
                return "좋은 활동량입니다"
            case .fullBack, .winger:
                return "스프린트 빈도를 높여 공격에 기여해보세요"
            case .striker:
                return "수비 라인 뒤로 침투하는 스프린트를 늘려보세요"
            default:
                return "전환 상황에서 더 빠른 스프린트가 필요합니다"
            }
        } else {
            return "훌륭한 경기력입니다! 꾸준히 유지하세요"
        }
    }
}

#Preview {
    let session = FitnessSession(position: .centralMidfielder, isMatch: true)
    session.endTime = Date()
    session.totalDistance = 8500
    session.sprintDistance = 1000
    session.sprintCount = 15
    session.averageHeartRate = 155
    session.maxHeartRate = 182
    session.activeCalories = 450
    session.averageSpeed = 2.5
    session.maxSpeed = 6.5

    return SummaryView(session: session)
}
