cask "xdraw" do
  version "1.0.0"

  # After publishing a GitHub release, replace with:
  #   sha256 "<sha256 of the DMG>"
  # and update the URL below.
  sha256 :no_check

  url "https://github.com/YOUR_USERNAME/xdraw/releases/download/v#{version}/xDraw-#{version}-universal.dmg"
  name "xDraw"
  desc "Architecture drawing tool based on Excalidraw"
  homepage "https://github.com/YOUR_USERNAME/xdraw"

  app "xDraw.app"

  zap trash: [
    "~/Library/Application Support/xDraw",
    "~/Library/Preferences/com.local.xdraw.plist",
    "~/Library/Saved Application State/com.local.xdraw.savedState",
    "~/Library/Logs/xDraw",
    "~/Library/Caches/com.local.xdraw",
  ]
end
