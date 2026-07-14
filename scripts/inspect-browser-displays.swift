import AppKit
import CoreGraphics

let targetDisplayName = "Built-in Retina Display"
let browserOwnerNames = Set(["Safari", "Google Chrome", "Firefox", "Opera", "Opera GX"])
let primaryTop = NSScreen.screens.first?.frame.maxY ?? 0
let displays = NSScreen.screens.map { screen in
  let frame = screen.frame
  return (
    name: screen.localizedName,
    frame: CGRect(
      x: frame.minX,
      y: primaryTop - frame.maxY,
      width: frame.width,
      height: frame.height
    )
  )
}

for display in displays {
  print(
    "DISPLAY name=\(display.name) target=\(display.name == targetDisplayName) "
      + "bounds=\(Int(display.frame.minX)),\(Int(display.frame.minY)),"
      + "\(Int(display.frame.width)),\(Int(display.frame.height))"
  )
}

let windows = CGWindowListCopyWindowInfo(
  [.optionOnScreenOnly, .excludeDesktopElements],
  kCGNullWindowID
) as? [[String: Any]] ?? []

for window in windows {
  guard
    let ownerName = window[kCGWindowOwnerName as String] as? String,
    browserOwnerNames.contains(ownerName),
    (window[kCGWindowLayer as String] as? Int) == 0,
    let bounds = window[kCGWindowBounds as String] as? [String: CGFloat],
    let x = bounds["X"],
    let y = bounds["Y"],
    let width = bounds["Width"],
    let height = bounds["Height"],
    width >= 300,
    height >= 200
  else {
    continue
  }

  let frame = CGRect(x: x, y: y, width: width, height: height)
  let center = CGPoint(x: frame.midX, y: frame.midY)
  let display = displays.first { $0.frame.contains(center) }
  let displayName = display?.name ?? "unmatched"
  let title = window[kCGWindowName as String] as? String ?? ""
  let windowId = window[kCGWindowNumber as String] as? Int ?? -1

  print(
    "BROWSER id=\(windowId) app=\(ownerName) display=\(displayName) target=\(displayName == targetDisplayName) "
      + "bounds=\(Int(x)),\(Int(y)),\(Int(width)),\(Int(height)) title=\(title)"
  )
}
