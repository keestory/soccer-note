import SwiftUI

struct HomeView: View {
    @State private var showPositionSelect = false
    @State private var isMatch = true

    var body: some View {
        NavigationStack {
            VStack(spacing: 16) {
                // App title
                HStack {
                    Image(systemName: "sportscourt.fill")
                        .foregroundColor(.green)
                    Text("SoccerNote")
                        .font(.headline)
                }
                .padding(.top, 8)

                Spacer()

                // Match button
                Button {
                    isMatch = true
                    showPositionSelect = true
                } label: {
                    VStack(spacing: 4) {
                        Image(systemName: "flag.fill")
                            .font(.title2)
                        Text("경기")
                            .font(.caption)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(Color.green.opacity(0.3))
                    .cornerRadius(12)
                }
                .buttonStyle(.plain)

                // Training button
                Button {
                    isMatch = false
                    showPositionSelect = true
                } label: {
                    VStack(spacing: 4) {
                        Image(systemName: "figure.run")
                            .font(.title2)
                        Text("훈련")
                            .font(.caption)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(Color.blue.opacity(0.3))
                    .cornerRadius(12)
                }
                .buttonStyle(.plain)

                Spacer()
            }
            .padding(.horizontal)
            .navigationDestination(isPresented: $showPositionSelect) {
                PositionSelectView(isMatch: isMatch)
            }
        }
    }
}

#Preview {
    HomeView()
}
