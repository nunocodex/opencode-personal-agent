<#
.SYNOPSIS
    Launcher for OpenCode Agents Telegram Bot
.DESCRIPTION
    Sets PYTHONPATH=src, activates .venv, runs python -m src.cli
.PARAMETER command
    Optional: check, setup, start, test (default: start)
#>

param(
    [string]$command = "start"
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$VenvDir = Join-Path $ScriptDir ".venv"

# Activate virtual environment
$PythonExe = Join-Path $VenvDir "Scripts\python.exe"
if (-not (Test-Path $PythonExe)) {
    Write-Host "Creating virtual environment..." -ForegroundColor Yellow
    python -m venv $VenvDir
    & $PythonExe -m pip install -r (Join-Path $ScriptDir "requirements.txt")
}

# Set PYTHONPATH and run
$env:PYTHONPATH = Join-Path $ScriptDir "src"
Write-Host "Starting: python -m src.cli $command" -ForegroundColor Cyan
& $PythonExe -m src.cli $command

if ($LASTEXITCODE -ne 0) {
    Write-Host "Command failed with exit code $LASTEXITCODE" -ForegroundColor Red
    exit $LASTEXITCODE
}
