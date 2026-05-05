import SwiftUI
import SwiftData

struct HistoryView: View {
    @Query(sort: \FitnessSession.startTime, order: .reverse)
    private var sessions: [FitnessSession]

    var body: some View {
        NavigationStack {
            if sessions.isEmpty {
                VStack(spacing: 8) {
                    Image(systemName: "clock.arrow.circlepath")
                        .font(.largeTitle)
                        .foregroundColor(.secondary)
                    Text("기록 없음")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            } else {
                List {
                    ForEach(sessions) { session in
                        NavigationLink {
                            SessionDetailView(session: session)
                        } label: {
                            SessionRowView(session: session)
                        }
                    }
                }
                .listStyle(.carousel)
            }
        }
    }
}

struct SessionRowView: View {
    let session: FitnessSession

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(session.position.emoji)
                Text(session.isMatch ? "경기" : "훈련")
                    .font(.caption2)
                    .padding(.horizontal, 4)
                    .padding(.vertical, 2)
                    .background(session.isMatch ? Color.green.opacity(0.3) : Color.blue.opacity(0.3))
                    .cornerRadius(4)
                Spacer()
                Text(formatDate(session.startTime))
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }

            HStack {
                Text(String(format: "%.2f km", session.totalDistanceKm))
                    .font(.caption)
                Spacer()
                Text("\(session.durationMinutes)분")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .padding(.vertical, 4)
    }

    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "M/d"
        return formatter.string(from: date)
    }
}

struct SessionDetailView: View {
    let session: FitnessSession

    private var rating: PerformanceRating {
        PerformanceRating.calculate(for: session)
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 8) {
                // Header
                HStack {
                    Text(session.position.emoji)
                    Text(session.position.displayName)
                        .font(.caption)
                    Spacer()
                }

                // Rating
                HStack {
                    Text("평가")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                    Spacer()
                    Text(String(format: "%.1f", rating.score))
                        .font(.title3)
                        .fontWeight(.bold)
                        .foregroundColor(ratingColor)
                    Text("/ 10")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }

                Divider()

                // Stats
                VStack(spacing: 4) {
                    DetailStatRow(icon: "figure.run", label: "거리", value: String(format: "%.2f km", session.totalDistanceKm))
                    DetailStatRow(icon: "bolt.fill", label: "스프린트", value: "\(session.sprintCount)회")
                    DetailStatRow(icon: "heart.fill", label: "평균 심박", value: "\(Int(session.averageHeartRate)) BPM")
                    DetailStatRow(icon: "speedometer", label: "최고 속도", value: String(format: "%.1f km/h", session.maxSpeed * 3.6))
                    DetailStatRow(icon: "flame.fill", label: "칼로리", value: "\(Int(session.activeCalories)) kcal")
                }

                if session.isMatch {
                    Divider()

                    // Quarter breakdown
                    VStack(alignment: .leading, spacing: 4) {
                        Text("쿼터별 거리")
                            .font(.caption2)
                            .foregroundColor(.secondary)

                        ForEach(0..<4, id: \.self) { i in
                            HStack {
                                Text("Q\(i + 1)")
                                    .font(.caption2)
                                    .frame(width: 24)
                                ProgressView(value: session.quarterDistances[i] / 2500) // Assume max 2.5km per quarter
                                    .tint(.green)
                                Text(String(format: "%.0fm", session.quarterDistances[i]))
                                    .font(.caption2)
                                    .frame(width: 40, alignment: .trailing)
                            }
                        }
                    }
                }

                // Sync status
                if let matchId = session.matchId {
                    HStack {
                        Image(systemName: session.syncedToServer ? "checkmark.icloud.fill" : "icloud.slash")
                            .foregroundColor(session.syncedToServer ? .green : .orange)
                        Text(session.syncedToServer ? "동기화됨" : "동기화 대기")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                    .padding(.top, 8)
                }
            }
            .padding(.horizontal, 8)
        }
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

struct DetailStatRow: View {
    let icon: String
    let label: String
    let value: String

    var body: some View {
        HStack {
            Image(systemName: icon)
                .font(.caption2)
                .frame(width: 16)
                .foregroundColor(.secondary)
            Text(label)
                .font(.caption2)
                .foregroundColor(.secondary)
            Spacer()
            Text(value)
                .font(.caption)
        }
    }
}

#Preview {
    HistoryView()
        .modelContainer(for: FitnessSession.self, inMemory: true)
}
