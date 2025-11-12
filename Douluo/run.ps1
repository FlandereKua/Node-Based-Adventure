# Run script for Windows PowerShell

Write-Host "Starting Douluo - Turn-Based Grid RPG..." -ForegroundColor Green
Write-Host ""

# Check if Python is installed
$pythonCmd = Get-Command py -ErrorAction SilentlyContinue
if (-not $pythonCmd) {
    Write-Host "Error: Python is not installed or not in PATH" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if pygame is installed
$pygameCheck = py -c "import pygame" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "pygame not found. Installing dependencies..." -ForegroundColor Yellow
    py -m pip install -r requirements.txt
}

# Run the game
py main.py

# Keep window open if error occurs
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Game exited with error code: $LASTEXITCODE" -ForegroundColor Red
    Read-Host "Press Enter to exit"
}
