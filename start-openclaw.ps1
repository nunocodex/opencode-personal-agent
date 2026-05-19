#!/usr/bin/env pwsh
# Start OpenClaw with project config
$env:OPENCLAW_CONFIG_PATH = "$PSScriptRoot\openclaw.json"
openclaw gateway
