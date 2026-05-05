import Foundation
import CoreLocation
import Combine

@MainActor
class LocationManager: NSObject, ObservableObject {
    static let shared = LocationManager()

    private let locationManager = CLLocationManager()
    private var lastLocation: CLLocation?
    private var locations: [CLLocation] = []

    @Published var isTracking = false
    @Published var totalDistance: Double = 0 // meters
    @Published var sprintDistance: Double = 0 // meters
    @Published var sprintCount: Int = 0
    @Published var currentSpeed: Double = 0 // m/s
    @Published var averageSpeed: Double = 0 // m/s
    @Published var maxSpeed: Double = 0 // m/s

    // Quarter tracking
    @Published var currentQuarter: Int = 1
    @Published var quarterDistances: [Double] = [0, 0, 0, 0]
    private var quarterStartDistance: Double = 0

    private let sprintThreshold: Double = 5.56 // 20 km/h in m/s
    private var isInSprint = false
    private var sprintStartDistance: Double = 0

    override init() {
        super.init()
        locationManager.delegate = self
        locationManager.desiredAccuracy = kCLLocationAccuracyBest
        locationManager.activityType = .fitness
        locationManager.allowsBackgroundLocationUpdates = true
    }

    func requestAuthorization() {
        locationManager.requestWhenInUseAuthorization()
    }

    func startTracking() {
        locations = []
        lastLocation = nil
        totalDistance = 0
        sprintDistance = 0
        sprintCount = 0
        currentSpeed = 0
        averageSpeed = 0
        maxSpeed = 0
        currentQuarter = 1
        quarterDistances = [0, 0, 0, 0]
        quarterStartDistance = 0
        isInSprint = false

        locationManager.startUpdatingLocation()
        isTracking = true
    }

    func stopTracking() {
        locationManager.stopUpdatingLocation()
        isTracking = false
    }

    func nextQuarter() {
        guard currentQuarter < 4 else { return }

        // Save current quarter distance
        let quarterDistance = totalDistance - quarterStartDistance
        quarterDistances[currentQuarter - 1] = quarterDistance

        // Move to next quarter
        currentQuarter += 1
        quarterStartDistance = totalDistance
    }

    func finishSession() {
        // Save final quarter distance
        let quarterDistance = totalDistance - quarterStartDistance
        quarterDistances[currentQuarter - 1] = quarterDistance
    }

    private func updateMetrics(with location: CLLocation) {
        // Update speed
        currentSpeed = max(0, location.speed)
        if currentSpeed > maxSpeed {
            maxSpeed = currentSpeed
        }

        // Calculate distance from last location
        if let last = lastLocation {
            let distance = location.distance(from: last)

            // Filter out unrealistic jumps (GPS errors)
            if distance < 100 { // Max 100m between updates
                totalDistance += distance

                // Sprint detection
                if currentSpeed >= sprintThreshold {
                    if !isInSprint {
                        isInSprint = true
                        sprintStartDistance = totalDistance
                        sprintCount += 1
                    }
                    sprintDistance += distance
                } else {
                    isInSprint = false
                }
            }
        }

        lastLocation = location
        locations.append(location)

        // Update average speed
        if !locations.isEmpty {
            let totalSpeed = locations.reduce(0.0) { $0 + max(0, $1.speed) }
            averageSpeed = totalSpeed / Double(locations.count)
        }
    }
}

extension LocationManager: CLLocationManagerDelegate {
    nonisolated func locationManager(
        _ manager: CLLocationManager,
        didUpdateLocations locations: [CLLocation]
    ) {
        guard let location = locations.last else { return }

        Task { @MainActor in
            self.updateMetrics(with: location)
        }
    }

    nonisolated func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        // Handle authorization changes
    }

    nonisolated func locationManager(
        _ manager: CLLocationManager,
        didFailWithError error: Error
    ) {
        print("Location error: \(error)")
    }
}
