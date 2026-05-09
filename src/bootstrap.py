"""Bootstrap: pre-flight checks and environment validation."""
from __future__ import annotations

import os
import shutil
import sys
import time
from pathlib import Path

from config import load_config


def _check_python_version() -> None:
    if sys.version_info < (3, 12):
        raise RuntimeError(f"Python 3.12+ required, found {sys.version}")


def _check_dotenv() -> None:
    if not os.path.exists(".env"):
        raise RuntimeError(".env file not found. Copy .env.example to .env and fill it in.")


def _check_opencode_in_path() -> None:
    if shutil.which("opencode") is None:
        raise RuntimeError("'opencode' command not found in PATH.")


def _ensure_storage_dirs() -> None:
    for sub in ("logs", "models", "temp"):
        Path("storage", sub).mkdir(parents=True, exist_ok=True)


def _clean_temp() -> None:
    temp_dir = Path("storage/temp")
    if not temp_dir.exists():
        return
    cutoff = time.time() - 3600
    for entry in temp_dir.iterdir():
        try:
            if entry.is_file() and entry.stat().st_mtime < cutoff:
                entry.unlink()
            elif entry.is_dir():
                shutil.rmtree(entry)
        except OSError as exc:
            print(f"[bootstrap] temp cleanup warning: {exc}")


def run_checks() -> Config:
    """Run all bootstrap checks and return validated config."""
    _check_python_version()
    _check_dotenv()
    config = load_config()
    _check_opencode_in_path()
    _ensure_storage_dirs()
    _clean_temp()
    return config
