import AVFoundation
import AppKit
import CoreGraphics
import CoreMedia
import Foundation
import ScreenCaptureKit

private struct Options {
  let duration: Double?
  let outputPath: String
  let windowId: CGWindowID

  init(arguments: [String]) throws {
    var duration: Double?
    var outputPath: String?
    var windowId: CGWindowID?
    var index = 0
    while index < arguments.count {
      guard index + 1 < arguments.count else {
        throw RecorderError.invalidArguments("Missing value for \(arguments[index])")
      }
      switch arguments[index] {
      case "--duration":
        guard let value = Double(arguments[index + 1]), value > 0 else {
          throw RecorderError.invalidArguments("--duration must be greater than zero")
        }
        duration = value
      case "--output":
        outputPath = arguments[index + 1]
      case "--window-id":
        guard let value = UInt32(arguments[index + 1]), value > 0 else {
          throw RecorderError.invalidArguments("--window-id must be a positive integer")
        }
        windowId = value
      default:
        throw RecorderError.invalidArguments("Unknown argument: \(arguments[index])")
      }
      index += 2
    }
    guard let outputPath, let windowId else {
      throw RecorderError.invalidArguments(
        "Usage: record-browser-window.swift --window-id <id> --output <file.mp4> [--duration <seconds>]"
      )
    }
    self.duration = duration
    self.outputPath = outputPath
    self.windowId = windowId
  }
}

private enum RecorderError: LocalizedError {
  case invalidArguments(String)
  case invalidBrowserWindow(String)
  case recording(String)

  var errorDescription: String? {
    switch self {
    case .invalidArguments(let message),
      .invalidBrowserWindow(let message),
      .recording(let message):
      return message
    }
  }
}

@available(macOS 15.0, *)
private final class RecordingDelegate: NSObject, SCRecordingOutputDelegate, SCStreamDelegate {
  private(set) var failure: Error?

  func recordingOutput(_ recordingOutput: SCRecordingOutput, didFailWithError error: Error) {
    failure = error
  }

  func stream(_ stream: SCStream, didStopWithError error: Error) {
    failure = error
  }
}

private final class StopSignalWaiter: @unchecked Sendable {
  private var continuation: CheckedContinuation<Void, Never>?
  private var sources: [DispatchSourceSignal] = []

  func wait() async {
    signal(SIGINT, SIG_IGN)
    signal(SIGTERM, SIG_IGN)
    await withCheckedContinuation { continuation in
      self.continuation = continuation
      for signalNumber in [SIGINT, SIGTERM] {
        let source = DispatchSource.makeSignalSource(
          signal: signalNumber,
          queue: .global(qos: .userInitiated)
        )
        source.setEventHandler { [weak self] in self?.finish() }
        source.resume()
        sources.append(source)
      }
    }
  }

  private func finish() {
    guard let continuation else { return }
    self.continuation = nil
    sources.forEach { $0.cancel() }
    sources.removeAll()
    continuation.resume()
  }
}

@main
private struct BrowserWindowRecorder {
  private static let allowedBrowserBundleIds = Set([
    "com.apple.Safari",
    "com.google.Chrome",
    "com.operasoftware.Opera",
    "com.operasoftware.OperaGX",
    "org.mozilla.firefox",
  ])

  static func main() async {
    do {
      let options = try Options(arguments: Array(CommandLine.arguments.dropFirst()))
      guard #available(macOS 15.0, *) else {
        throw RecorderError.recording("Window-only recording requires macOS 15 or newer")
      }
      try await record(options: options)
    } catch {
      FileHandle.standardError.write(
        Data("recording-error=\(error.localizedDescription)\n".utf8)
      )
      exit(1)
    }
  }

  @available(macOS 15.0, *)
  private static func record(options: Options) async throws {
    await MainActor.run { _ = NSApplication.shared } // Bug: command-line capture aborts with CGS_REQUIRE_INIT before touching ScreenCaptureKit; initialize AppKit on its actor first so the process joins the window-server session.
    let outputUrl = URL(fileURLWithPath: options.outputPath)
    guard outputUrl.pathExtension.lowercased() == "mp4" else {
      throw RecorderError.invalidArguments("--output must use the .mp4 extension")
    }
    guard !FileManager.default.fileExists(atPath: outputUrl.path) else {
      throw RecorderError.invalidArguments("Output already exists: \(outputUrl.path)")
    }

    let content = try await SCShareableContent.excludingDesktopWindows(
      false,
      onScreenWindowsOnly: false
    )
    guard let window = content.windows.first(where: { $0.windowID == options.windowId }) else {
      throw RecorderError.invalidBrowserWindow(
        "The dedicated test-browser window no longer exists: \(options.windowId)"
      )
    }
    let bundleId = window.owningApplication?.bundleIdentifier ?? ""
    guard allowedBrowserBundleIds.contains(bundleId) else {
      throw RecorderError.invalidBrowserWindow(
        "Window \(options.windowId) belongs to \(bundleId.isEmpty ? "an unknown app" : bundleId), not an approved test browser"
      )
    }

    let filter = SCContentFilter(desktopIndependentWindow: window)
    let sourceWidth = max(2, Int(filter.contentRect.width * CGFloat(filter.pointPixelScale)))
    let sourceHeight = max(2, Int(filter.contentRect.height * CGFloat(filter.pointPixelScale)))
    let downscale = min(1, 1920 / Double(sourceWidth))
    let configuration = SCStreamConfiguration()
    configuration.width = evenPixelSize(Double(sourceWidth) * downscale)
    configuration.height = evenPixelSize(Double(sourceHeight) * downscale)
    configuration.minimumFrameInterval = CMTime(value: 1, timescale: 30)
    configuration.queueDepth = 6
    configuration.scalesToFit = true
    configuration.showsCursor = true
    configuration.showMouseClicks = true
    configuration.capturesAudio = false
    configuration.captureMicrophone = false
    configuration.ignoreShadowsSingleWindow = true
    configuration.captureResolution = .best

    let delegate = RecordingDelegate()
    let recordingConfiguration = SCRecordingOutputConfiguration()
    recordingConfiguration.outputURL = outputUrl
    recordingConfiguration.videoCodecType = .h264
    recordingConfiguration.outputFileType = .mp4
    let recordingOutput = SCRecordingOutput(
      configuration: recordingConfiguration,
      delegate: delegate
    )
    let stream = SCStream(
      filter: filter,
      configuration: configuration,
      delegate: delegate
    )
    try stream.addRecordingOutput(recordingOutput)
    try await stream.startCapture()
    print(
      "recording-started=window:\(options.windowId),bundle:\(bundleId),size:\(configuration.width)x\(configuration.height)"
    )
    fflush(stdout)

    if let duration = options.duration {
      try await Task.sleep(for: .seconds(duration))
    } else {
      await StopSignalWaiter().wait()
    }
    try await stream.stopCapture()
    try await Task.sleep(for: .milliseconds(400))
    if let failure = delegate.failure {
      throw RecorderError.recording(failure.localizedDescription)
    }
    let attributes = try FileManager.default.attributesOfItem(atPath: outputUrl.path)
    let size = attributes[.size] as? NSNumber
    guard size?.intValue ?? 0 > 0 else {
      throw RecorderError.recording("Recording finished without producing video data")
    }
    print("recording-finished=\(outputUrl.lastPathComponent),bytes:\(size?.intValue ?? 0)")
  }

  private static func evenPixelSize(_ value: Double) -> Int {
    max(2, Int(value) / 2 * 2)
  }
}
