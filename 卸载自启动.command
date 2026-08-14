#!/bin/bash
# Lumitest 开机自启动 - 卸载(Mac 版)
PLIST="$HOME/Library/LaunchAgents/com.lumitest.pet.plist"
launchctl unload "$PLIST" 2>/dev/null || true
rm -f "$PLIST"
echo "已卸载开机自启动(不影响手动双击启动)"
