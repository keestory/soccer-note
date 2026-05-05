import SwiftUI

struct PositionSelectView: View {
    let isMatch: Bool
    @State private var selectedPosition: Position?
    @State private var showSession = false

    private let positions: [[Position]] = [
        [.striker],
        [.winger, .attackingMidfielder, .winger],
        [.centralMidfielder, .defensiveMidfielder],
        [.fullBack, .centerBack, .centerBack, .fullBack],
        [.goalkeeper]
    ]

    var body: some View {
        ScrollView {
            VStack(spacing: 6) {
                Text("포지션 선택")
                    .font(.caption)
                    .foregroundColor(.secondary)

                ForEach(Array(positions.enumerated()), id: \.offset) { _, row in
                    HStack(spacing: 4) {
                        ForEach(row, id: \.self) { position in
                            PositionButton(
                                position: position,
                                isSelected: selectedPosition == position,
                                action: {
                                    selectedPosition = position
                                    showSession = true
                                }
                            )
                        }
                    }
                }
            }
            .padding(.horizontal, 4)
        }
        .navigationDestination(isPresented: $showSession) {
            if let position = selectedPosition {
                SessionView(position: position, isMatch: isMatch)
            }
        }
    }
}

struct PositionButton: View {
    let position: Position
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 2) {
                Text(position.emoji)
                    .font(.system(size: 16))
                Text(position.shortName)
                    .font(.system(size: 10, weight: .medium))
            }
            .frame(width: 36, height: 36)
            .background(isSelected ? Color.green : Color.gray.opacity(0.3))
            .cornerRadius(6)
        }
        .buttonStyle(.plain)
    }
}

#Preview {
    PositionSelectView(isMatch: true)
}
