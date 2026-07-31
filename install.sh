#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo ""
echo "██╗  ██╗███████╗██╗     ███████╗██╗  ██╗"
echo "██║ ██╔╝██╔════╝██║     ██╔════╝╚██╗██╔╝"
echo "█████╔╝ █████╗  ██║     █████╗   ╚███╔╝ "
echo "██╔═██╗ ██╔══╝  ██║     ██╔══╝  ██╔██╗ "
echo "██║  ██╗███████╗███████╗███████╗██╔╝ ██╗"
echo "╚═╝  ╚═╝╚══════╝╚══════╝╚══════╝╚═╝  ╚═╝"
echo "        Kelex 1-Click Auto-Installer"
echo ""

echo "⚙️ 0/4 Installing Native System Dependencies (yt-dlp, aria2, ffmpeg)..."
if [[ "$OSTYPE" == "darwin"* ]]; then
  if command -v brew >/dev/null 2>&1; then
    brew install yt-dlp aria2 ffmpeg || true
  else
    echo "⚠️  Homebrew not found! Please install Homebrew or manually install: yt-dlp aria2 ffmpeg"
  fi
elif command -v apt-get >/dev/null 2>&1; then
  sudo apt-get update || true
  sudo apt-get install -y yt-dlp aria2 ffmpeg || true
else
  echo "⚠️  Unsupported package manager. Please manually install: yt-dlp aria2 ffmpeg"
fi
echo ""

echo "📦 1/4 Installing Node dependencies..."
npm install --quiet
cd backend && npm install --quiet && cd ..

echo "🔨 2/4 Building Kelex Engine & CLI..."
npm run build
node extension/generate-icons.js

echo "🔗 3/4 Linking kelex, kelexd-cli, and kelex-cli globally..."
mkdir -p "$HOME/.local/bin"
ln -sf "$SCRIPT_DIR/backend/dist/cli/index.js" "$HOME/.local/bin/kelex" || true
ln -sf "$SCRIPT_DIR/backend/dist/cli/index.js" "$HOME/.local/bin/kelexd-cli" || true
ln -sf "$SCRIPT_DIR/backend/dist/cli/index.js" "$HOME/.local/bin/kelex-cli" || true
npm link || true

echo "🌐 4/4 Auto-Launching Browser with Kelex Extension..."
node backend/dist/cli/index.js extension install

echo ""
echo "✅ Kelex setup complete! Run 'kelex' or 'kelexd-cli' anywhere in your terminal."
echo ""
