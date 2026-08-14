#!/bin/bash
# Lumitest 开机自启动 - 安装(Mac 版)。只写当前用户的 LaunchAgent,不碰系统级配置。
set -e
cd "$(dirname "$0")" || exit 1
PET_DIR="$(pwd)"
NODE_BIN="$(dirname "$(command -v node)")"
if [ -z "$NODE_BIN" ]; then echo "找不到 node,先装 Node.js"; exit 1; fi
PLIST="$HOME/Library/LaunchAgents/com.lumitest.pet.plist"
mkdir -p "$HOME/Library/LaunchAgents"
cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.lumitest.pet</string>
  <key>ProgramArguments</key>
  <array>
    <string>$PET_DIR/node_modules/.bin/electron</string>
    <string>$PET_DIR</string>
  </array>
  <key>WorkingDirectory</key><string>$PET_DIR</string>
  <key>EnvironmentVariables</key>
  <dict><key>PATH</key><string>$NODE_BIN:/usr/bin:/bin</string></dict>
  <key>RunAtLoad</key><true/>
  <key>StandardOutPath</key><string>$PET_DIR/.autostart.log</string>
  <key>StandardErrorPath</key><string>$PET_DIR/.autostart.log</string>
</dict>
</plist>
EOF
launchctl unload "$PLIST" 2>/dev/null || true
launchctl load "$PLIST"
echo "已安装:$PLIST"
echo "以后开机登录后 Lumitest 会自己出现。卸载请双击 卸载自启动.command"
