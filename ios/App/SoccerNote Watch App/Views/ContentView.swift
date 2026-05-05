import SwiftUI
import SwiftData

struct ContentView: View {
    var body: some View {
        TabView {
            HomeView()
                .tag(0)

            HistoryView()
                .tag(1)
        }
        .tabViewStyle(.verticalPage)
    }
}

#Preview {
    ContentView()
        .modelContainer(for: FitnessSession.self, inMemory: true)
}
