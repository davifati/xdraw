#!/bin/bash
# Build xDraw as a macOS desktop application.
# Output: dist-electron/xDraw-*.dmg  (universal: arm64 + x64)
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "==> [1/3] Building Excalidraw web app..."
yarn --cwd "$ROOT" --cwd excalidraw-app build

echo ""
echo "==> [2/3] Installing Electron dependencies..."
npm install --prefix "$ROOT/desktop"

echo ""
echo "==> [3/3] Packaging Electron app..."
npm run build --prefix "$ROOT/desktop"

echo ""
echo "✓ Done! Output:"
ls "$ROOT/dist-electron/"*.dmg 2>/dev/null || true
ls "$ROOT/dist-electron/"*.zip 2>/dev/null || true
