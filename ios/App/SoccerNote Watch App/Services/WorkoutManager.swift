import Foundation
import HealthKit
import Combine

@MainActor
class WorkoutManager: NSObject, ObservableObject {
    static let shared = WorkoutManager()

    private let healthStore = HKHealthStore()
    private var session: HKWorkoutSession?
    private var builder: HKLiveWorkoutBuilder?

    @Published var isWorkoutActive = false
    @Published var heartRate: Double = 0
    @Published var activeCalories: Double = 0
    @Published var elapsedTime: TimeInterval = 0

    private var heartRateSamples: [Double] = []
    private var timer: Timer?

    override init() {
        super.init()
    }

    var averageHeartRate: Double {
        guard !heartRateSamples.isEmpty else { return 0 }
        return heartRateSamples.reduce(0, +) / Double(heartRateSamples.count)
    }

    var maxHeartRate: Double {
        heartRateSamples.max() ?? 0
    }

    func requestAuthorization() async -> Bool {
        guard HKHealthStore.isHealthDataAvailable() else { return false }

        let typesToRead: Set<HKObjectType> = [
            HKObjectType.quantityType(forIdentifier: .heartRate)!,
            HKObjectType.quantityType(forIdentifier: .activeEnergyBurned)!,
            HKObjectType.quantityType(forIdentifier: .distanceWalkingRunning)!,
            HKObjectType.workoutType()
        ]

        let typesToWrite: Set<HKSampleType> = [
            HKObjectType.quantityType(forIdentifier: .activeEnergyBurned)!,
            HKObjectType.quantityType(forIdentifier: .distanceWalkingRunning)!,
            HKObjectType.workoutType()
        ]

        do {
            try await healthStore.requestAuthorization(toShare: typesToWrite, read: typesToRead)
            return true
        } catch {
            print("HealthKit authorization failed: \(error)")
            return false
        }
    }

    func startWorkout() async throws {
        let configuration = HKWorkoutConfiguration()
        configuration.activityType = .soccer
        configuration.locationType = .outdoor

        session = try HKWorkoutSession(healthStore: healthStore, configuration: configuration)
        builder = session?.associatedWorkoutBuilder()

        builder?.dataSource = HKLiveWorkoutDataSource(
            healthStore: healthStore,
            workoutConfiguration: configuration
        )

        session?.delegate = self
        builder?.delegate = self

        let startDate = Date()
        session?.startActivity(with: startDate)
        try await builder?.beginCollection(at: startDate)

        isWorkoutActive = true
        heartRateSamples = []

        startTimer()
    }

    func endWorkout() async {
        guard let session = session, let builder = builder else { return }

        session.end()

        do {
            try await builder.endCollection(at: Date())
            try await builder.finishWorkout()
        } catch {
            print("Failed to end workout: \(error)")
        }

        stopTimer()
        isWorkoutActive = false
        self.session = nil
        self.builder = nil
    }

    private func startTimer() {
        timer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
            Task { @MainActor in
                self?.elapsedTime += 1
            }
        }
    }

    private func stopTimer() {
        timer?.invalidate()
        timer = nil
    }

    func resetMetrics() {
        heartRate = 0
        activeCalories = 0
        elapsedTime = 0
        heartRateSamples = []
    }
}

extension WorkoutManager: HKWorkoutSessionDelegate {
    nonisolated func workoutSession(
        _ workoutSession: HKWorkoutSession,
        didChangeTo toState: HKWorkoutSessionState,
        from fromState: HKWorkoutSessionState,
        date: Date
    ) {
        Task { @MainActor in
            if toState == .ended {
                isWorkoutActive = false
            }
        }
    }

    nonisolated func workoutSession(
        _ workoutSession: HKWorkoutSession,
        didFailWithError error: Error
    ) {
        print("Workout session failed: \(error)")
    }
}

extension WorkoutManager: HKLiveWorkoutBuilderDelegate {
    nonisolated func workoutBuilder(
        _ workoutBuilder: HKLiveWorkoutBuilder,
        didCollectDataOf collectedTypes: Set<HKSampleType>
    ) {
        for type in collectedTypes {
            guard let quantityType = type as? HKQuantityType else { continue }

            let statistics = workoutBuilder.statistics(for: quantityType)

            Task { @MainActor in
                switch quantityType {
                case HKQuantityType.quantityType(forIdentifier: .heartRate):
                    if let value = statistics?.mostRecentQuantity()?.doubleValue(for: .hertzUnit(with: .nano).unitMultiplied(by: .minute())) {
                        // Convert from Hz*min to BPM
                        let bpm = value * 60
                        self.heartRate = bpm
                        self.heartRateSamples.append(bpm)
                    }
                case HKQuantityType.quantityType(forIdentifier: .activeEnergyBurned):
                    if let value = statistics?.sumQuantity()?.doubleValue(for: .kilocalorie()) {
                        self.activeCalories = value
                    }
                default:
                    break
                }
            }
        }
    }

    nonisolated func workoutBuilderDidCollectEvent(_ workoutBuilder: HKLiveWorkoutBuilder) {
        // Handle workout events if needed
    }
}
