#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="$SCRIPT_DIR/.venv"
PYTHON="python3"

# Detect python
if ! command -v $PYTHON &>/dev/null; then
    PYTHON="python"
fi

# Activate virtual environment
if [ ! -f "$VENV_DIR/bin/python" ]; then
    echo "Creating virtual environment..."
    $PYTHON -m venv "$VENV_DIR"
    "$VENV_DIR/bin/pip" install -r "$SCRIPT_DIR/requirements.txt"
fi

# Set PYTHONPATH and run
export PYTHONPATH="$SCRIPT_DIR/src"
COMMAND="${1:-start}"

echo "Starting: python -m src.cli $COMMAND"
exec "$VENV_DIR/bin/python" -m src.cli "$COMMAND"
