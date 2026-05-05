import SwiftUI
import SwiftData

struct SessionView: View {
    let position: Position
    let isMatch: Bool

    @Environment(\.modelContext) private var modelContext
    @StateObject private var workoutManager = WorkoutManager.shared
    @StateObject private var locationManager = LocationManager.shared

    @State private var isActive = false
    @State private var showSummary = false
    @State private var currentSession: FitnessSession?

    private let quarterDuration: TimeInterval = 25 * 60 // 25 minutes

    var body: some View {
        ScrollView {
            VStack(spacing: 8) {
                // Header
                HStack {
                    Text(position.emoji)
                    Text(position.shortName)
                        .font(.caption)
                        .fontWeight(.bold)
                    Spacer()
                    if isMatch {
                        Text("Q\(locationManager.currentQuarter)")
                            .font(.caption2)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color.green)
                            .cornerRadius(4)
                    }
                }

                if isActive {
                    // Active session metrics
                    MetricsGrid(
                        heartRate: workoutManager.heartRate,
                        distance: locationManager.totalDistance / 1000,
                        speed: locationManager.currentSpeed * 3.6,
                        calories: workoutManager.activeCalories,
                        elapsedTime: workoutManager.elapsedTime,
                        sprintCount: locationManager.sprintCount,
                        position: position
                    )

                    // Control buttons
                    HStack(spacing: 8) {
                        if isMatch && locationManager.currentQuarter < 4 {
                            Button {
                                locationManager.nextQuarter()
                            } label: {
                                Image(systemName: "forward.fill")
                                    .font(.caption)
                            }
                            .buttonStyle(.bordered)
                        }

                        Button {
                            Task { await endSession() }
                        } label: {
                            Image(systemName: "stop.fill")
                                .foregroundColor(.red)
                        }
                        .buttonStyle(.bordered)
                        .tint(.red)
                    }
                } else {
                    // Start button
                    VStack(spacing: 12) {
                        Text(isMatch ? "경기 시작" : "훈련 시작")
                            .font(.caption)

                        Button {
                            Task { await startSession() }
                        } label: {
                            Image(systemName: "play.fill")
                                .font(.title2)
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(.green)
                    }
                    .padding(.top, 20)
                }
            }
            .padding(.horizontal, 8)
        }
        .navigationBarBackButtonHidden(isActive)
        .navigationDestination(isPresented: $showSummary) {
            if let session = currentSession {
                SummaryView(session: session)
            }
        }
    }

    private func startSession() async {
        let authorized = await workoutManager.requestAuthorization()
        guard authorized else { return }

        locationManager.requestAuthorization()

        do {
            try await workoutManager.startWorkout()
            locationManager.startTracking()

            currentSession = FitnessSession(
                position: position,
                isMatch: isMatch
            )

            isActive = true
        } catch {
            print("Failed to start session: \(error)")
        }
    }

    private func endSession() async {
        await workoutManager.endWorkout()
        locationManager.finishSession()
        locationManager.stopTracking()

        // Update session with final metrics
        if let session = currentSession {
            session.endTime = Date()
            session.totalDistance = locationManager.totalDistance
            session.sprintDistance = locationManager.sprintDistance
            session.sprintCount = locationManager.sprintCount
            session.averageHeartRate = workoutManager.averageHeartRate
            session.maxHeartRate = workoutManager.maxHeartRate
            session.activeCalories = workoutManager.activeCalories
            session.averageSpeed = locationManager.averageSpeed
            session.maxSpeed = locationManager.maxSpeed
            session.currentQuarter = locationManager.currentQuarter
            session.quarterDistances = locationManager.quarterDistances

            modelContext.insert(session)
            try? modelContext.save()
        }

        isActive = false
        workoutManager.resetMetrics()
        showSummary = true
    }
}

struct MetricsGrid: View {
    let heartRate: Double
    let distance: Double
    let speed: Double
    let calories: Double
    let elapsedTime: TimeInterval
    let sprintCount: Int
    let position: Position

    private var targetDistance: Double {
        position.benchmark.targetDistance
    }

    var body: some View {
        VStack(spacing: 6) {
            // Heart rate - large
            HStack {
                Image(systemName: "heart.fill")
                    .foregroundColor(.red)
                Text("\(Int(heartRate))")
                    .font(.title2)
                    .fontWeight(.bold)
                Text("BPM")
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }

            // Time
            Text(formatTime(elapsedTime))
                .font(.caption)
                .monospacedDigit()

            // Stats grid
            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible())
            ], spacing: 4) {
                MetricCell(
                    icon: "figure.run",
                    value: String(format: "%.2f", distance),
                    unit: "km",
                    color: .blue
                )

                MetricCell(
                    icon: "speedometer",
                    value: String(format: "%.1f", speed),
                    unit: "km/h",
                    color: .orange
                )

                MetricCell(
                    icon: "bolt.fill",
                    value: "\(sprintCount)",
                    unit: "스프린트",
                    color: .yellow
                )

                MetricCell(
                    icon: "flame.fill",
                    value: "\(Int(calories))",
                    unit: "kcal",
                    color: .red
                )
            }

            // Progress to target
            VStack(spacing: 2) {
                ProgressView(value: min(distance / targetDistance, 1.0))
                    .tint(.green)
                Text("목표: \(String(format: "%.1f", targetDistance))km")
                    .font(.system(size: 9))
                    .foregroundColor(.secondary)
            }
        }
    }

    private func formatTime(_ interval: TimeInterval) -> String {
        let minutes = Int(interval) / 60
        let seconds = Int(interval) % 60
        return String(format: "%02d:%02d", minutes, seconds)
    }
}

struct MetricCell: View {
    let icon: String
    let value: String
    let unit: String
    let color: Color

    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: icon)
                .font(.system(size: 10))
                .foregroundColor(color)
            VStack(alignment: .leading, spacing: 0) {
                Text(value)
                    .font(.system(size: 12, weight: .semibold))
                Text(unit)
                    .font(.system(size: 8))
                    .foregroundColor(.secondary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

#Preview {
    SessionView(position: .centralMidfielder, isMatch: true)
        .modelContainer(for: FitnessSession.self, inMemory: true)
}
