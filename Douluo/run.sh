#!/usr/bin/env bash
# Run script for Linux (Arch-based and other distros)

echo "Starting Douluo - Turn-Based Grid RPG..."
echo ""

# Check if Python is installed
if ! command -v python &> /dev/null; then
    if ! command -v python3 &> /dev/null; then
        echo "Error: Python is not installed"
        exit 1
    fi
    PYTHON_CMD="python3"
else
    PYTHON_CMD="python"
fi

echo "Using: $PYTHON_CMD"

# Check if pygame is installed
if ! $PYTHON_CMD -c "import pygame" 2>/dev/null; then
    echo "pygame not found. Installing dependencies..."
    
    # Try pip install
    if command -v pip &> /dev/null; then
        pip install -r requirements.txt
    elif command -v pip3 &> /dev/null; then
        pip3 install -r requirements.txt
    else
        echo "Warning: pip not found. Trying system package manager..."
        
        # Arch-based (pacman)
        if command -v pacman &> /dev/null; then
            echo "Detected Arch-based system"
            echo "Run: sudo pacman -S python-pygame"
            exit 1
        # Debian-based (apt)
        elif command -v apt &> /dev/null; then
            echo "Detected Debian-based system"
            echo "Run: sudo apt install python3-pygame"
            exit 1
        else
            echo "Unknown package manager. Please install pygame manually."
            exit 1
        fi
    fi
fi

# Run the game
$PYTHON_CMD main.py
