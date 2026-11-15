import Foundation
import Network

public final class Wire {
    private let path: String
    private let queue = DispatchQueue(label: "paral.wire")
    private var connection: NWConnection?
    private var pending = Data()
    /// Counts the connections begun: a retry waiting for its second goes only if no other has begun meanwhile.
    private var begun = 0
    public var onLine: ((Seen) -> Void)?
    public var onRefused: ((String) -> Void)?
    public var onUp: ((Bool) -> Void)?

    public init(path: String) { self.path = path }

    public func start() { queue.async { self.connect() } }

    /// Ends this connection and opens a new one at once, so the mind, which keeps a sitting per connection, starts a
    /// new one. The end of the old one is not told as the mind going down, and nothing it still sends is read.
    public func again() {
        queue.async {
            let old = self.connection
            self.connection = nil
            old?.cancel()
            self.pending = Data()
            self.connect()
        }
    }

    public func send(_ line: ToMind) {
        queue.async {
            self.connection?.send(content: Data(line.line.utf8), completion: .contentProcessed { _ in })
        }
    }

    private func connect() {
        let connection = NWConnection(to: .unix(path: path), using: .tcp)
        self.connection = connection
        begun += 1
        let mine = begun
        connection.stateUpdateHandler = { [weak self] state in
            guard let self else { return }
            switch state {
            case .ready:
                guard self.connection === connection else { return }
                DispatchQueue.main.async { self.onUp?(true) }
                self.send(.hello)
                self.receive(on: connection)
            case .failed, .waiting, .cancelled:
                guard self.connection === connection else { return }
                self.connection = nil
                DispatchQueue.main.async { self.onUp?(false) }
                connection.cancel()
                self.queue.asyncAfter(deadline: .now() + 1) { if self.begun == mine { self.connect() } }
            default:
                break
            }
        }
        connection.start(queue: queue)
    }

    private func receive(on connection: NWConnection) {
        connection.receive(minimumIncompleteLength: 1, maximumLength: 65536) { [weak self] data, _, done, error in
            guard let self else { return }
            if let data, self.connection === connection { self.take(data) }
            if done || error != nil {
                connection.cancel()
                return
            }
            self.receive(on: connection)
        }
    }

    private func take(_ data: Data) {
        pending.append(data)
        while let end = pending.firstIndex(of: 0x0A) {
            let text = String(decoding: pending[pending.startIndex..<end], as: UTF8.self)
            pending.removeSubrange(pending.startIndex...end)
            guard !text.isEmpty else { continue }
            switch Seen.read(text) {
            case .success(let line): DispatchQueue.main.async { self.onLine?(line) }
            case .failure(let refused): DispatchQueue.main.async { self.onRefused?(refused.why) }
            }
        }
    }
}
