#!/bin/bash
# AionUI Update Script - downloads latest release and restarts service
set -euo pipefail

SERVICE="aionui-webui"
TMP_DIR="/tmp"

echo "=== AionUI Updater ==="

# Pre-flight checks
command -v gh >/dev/null 2>&1 || { echo "❌ gh CLI not installed"; exit 1; }
command -v dpkg >/dev/null 2>&1 || { echo "❌ dpkg not available"; exit 1; }

# Get latest release tag
echo "[1/4] Checking latest release..."
LATEST=$(gh release view --repo iOfficeAI/AionUi --json tagName -q '.tagName') || { echo "❌ Failed to fetch release info"; exit 1; }
CURRENT=$(dpkg-query -W -f='${Version}' aionui 2>/dev/null || echo "none")
echo "  Current: $CURRENT | Latest: $LATEST"

if [ "$CURRENT" = "${LATEST#v}" ]; then
  echo "✅ Already up to date."
  exit 0
fi

# Download latest deb
echo "[2/4] Downloading ${LATEST}..."
DEB_NAME="AionUi-${LATEST#v}-linux-amd64.deb"
DEB_PATH="${TMP_DIR}/${DEB_NAME}"
gh release download "$LATEST" --repo iOfficeAI/AionUi --pattern "$DEB_NAME" --dir "$TMP_DIR" --clobber || { echo "❌ Download failed"; exit 1; }

# Install
echo "[3/4] Installing (requires sudo)..."
sudo dpkg -i "$DEB_PATH" || { echo "❌ Install failed"; rm -f "$DEB_PATH"; exit 1; }
rm -f "$DEB_PATH"

# Restart service
echo "[4/4] Restarting service..."
systemctl --user restart "$SERVICE"

echo "=== Update complete ==="
systemctl --user status "$SERVICE" --no-pager
