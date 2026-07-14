import AppKit
import CoreGraphics
import Foundation
import ImageIO
import ScreenCaptureKit
import UniformTypeIdentifiers

private struct Options {
  let outputPath: String
  let windowId: CGWindowID

  init(arguments: [String]) throws {
    var outputPath: String?
    var windowId: CGWindowID?
    var index = 0
    while index < arguments.count {
      guard index + 1 < arguments.count else {
        throw CaptureError.invalidArguments("Missing value for \(arguments[index])")
      }
      switch arguments[index] {
      case "--output":
        outputPath = arguments[index + 1]
      case "--window-id":
        guard let value = UInt32(arguments[index + 1]), value > 0 else {
          throw CaptureError.invalidArguments("--window-id must be a positive integer")
        }
        windowId = value
      default:
        throw CaptureError.invalidArguments("Unknown argument: \(arguments[index])")
      }
      index += 2
    }
    guard let outputPath, let windowId else {
      throw CaptureError.invalidArguments(
        "Usage: capture-browser-window.swift --window-id <id> --output <file.png>"
      )
    }
    self.outputPath = outputPath
    self.windowId = windowId
  }
}

private enum CaptureError: LocalizedError {
  case capture(String)
  case invalidArguments(String)
  case invalidBrowserWindow(String)

  var errorDescription: String? {
    switch self {
    case .capture(let message),
      .invalidArguments(let message),
      .invalidBrowserWindow(let message):
      return message
    }
  }
}

@main
private struct BrowserWindowCapture {
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
      try await capture(options: options)
    } catch {
      FileHandle.standardError.write(
        Data("capture-error=\(error.localizedDescription)\n".utf8)
      )
      exit(1)
    }
  }

  private static func capture(options: Options) async throws {
    await MainActor.run { _ = NSApplication.shared } // Bug: command-line capture aborts with CGS_REQUIRE_INIT before touching ScreenCaptureKit; initialize AppKit on its actor first so the process joins the window-server session.
    let outputUrl = URL(fileURLWithPath: options.outputPath)
    guard outputUrl.pathExtension.lowercased() == "png" else {
      throw CaptureError.invalidArguments("--output must use the .png extension")
    }
    guard !FileManager.default.fileExists(atPath: outputUrl.path) else {
      throw CaptureError.invalidArguments("Output already exists: \(outputUrl.path)")
    }

    let content = try await SCShareableContent.excludingDesktopWindows(
      false,
      onScreenWindowsOnly: false
    )
    guard let window = content.windows.first(where: { $0.windowID == options.windowId }) else {
      throw CaptureError.invalidBrowserWindow(
        "The dedicated test-browser window no longer exists: \(options.windowId)"
      )
    }
    let bundleId = window.owningApplication?.bundleIdentifier ?? ""
    guard allowedBrowserBundleIds.contains(bundleId) else {
      throw CaptureError.invalidBrowserWindow(
        "Window \(options.windowId) belongs to \(bundleId.isEmpty ? "an unknown app" : bundleId), not an approved test browser"
      )
    }

    let filter = SCContentFilter(desktopIndependentWindow: window)
    let sourceWidth = max(2, Int(filter.contentRect.width * CGFloat(filter.pointPixelScale)))
    let sourceHeight = max(2, Int(filter.contentRect.height * CGFloat(filter.pointPixelScale)))
    let downscale = min(1, 1920 / Double(sourceWidth))
    let configuration = SCStreamConfiguration()
    configuration.width = max(2, Int(Double(sourceWidth) * downscale))
    configuration.height = max(2, Int(Double(sourceHeight) * downscale))
    configuration.scalesToFit = true
    configuration.showsCursor = false
    configuration.ignoreShadowsSingleWindow = true
    configuration.captureResolution = .best

    let image = try await SCScreenshotManager.captureImage(
      contentFilter: filter,
      configuration: configuration
    )
    guard let destination = CGImageDestinationCreateWithURL(
      outputUrl as CFURL,
      UTType.png.identifier as CFString,
      1,
      nil
    ) else {
      throw CaptureError.capture("Could not create PNG destination: \(outputUrl.path)")
    }
    CGImageDestinationAddImage(destination, image, nil)
    guard CGImageDestinationFinalize(destination) else {
      throw CaptureError.capture("Could not write PNG screenshot: \(outputUrl.path)")
    }
    let attributes = try FileManager.default.attributesOfItem(atPath: outputUrl.path)
    let size = attributes[.size] as? NSNumber
    guard size?.intValue ?? 0 > 0 else {
      throw CaptureError.capture("Screenshot capture produced no image data")
    }
    print(
      "capture-finished=window:\(options.windowId),bundle:\(bundleId),size:\(image.width)x\(image.height),bytes:\(size?.intValue ?? 0)"
    )
  }
}
