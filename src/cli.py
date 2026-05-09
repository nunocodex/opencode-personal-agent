"""CLI entry point with check/setup/start/test commands."""
from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

# Ensure src/ is on path for imports when run as python -m src.cli
_SRC = str(Path(__file__).parent)
if _SRC not in sys.path:
    sys.path.insert(0, _SRC)


def _cmd_check() -> int:
    print("Running pre-flight checks...")
    try:
        from bootstrap import run_checks
        run_checks()
        print("All checks passed.")
        return 0
    except Exception as exc:
        print(f"Check failed: {exc}", file=sys.stderr)
        return 1


def _cmd_setup() -> int:
    print("Running setup...")
    env_example = Path(".env.example")
    env_file = Path(".env")
    if not env_file.exists() and env_example.exists():
        env_file.write_text(env_example.read_text(), encoding="utf-8")
        print("Created .env from .env.example — please edit it.")
    else:
        print(".env already exists.")

    for sub in ("logs", "models", "temp"):
        Path("storage", sub).mkdir(parents=True, exist_ok=True)
    print("Storage directories ready.")
    return 0


def _cmd_start() -> int:
    print("Starting bot...")
    try:
        from main import start_bot
        import asyncio
        asyncio.run(start_bot())
        return 0
    except KeyboardInterrupt:
        print("\nStopped.")
        return 0
    except Exception as exc:
        print(f"Failed to start: {exc}", file=sys.stderr)
        return 1


def _cmd_test() -> int:
    print("Running tests...")
    return subprocess.call([sys.executable, "-m", "pytest", "tests/", "-v", "--cov=src", "--cov-report=term-missing"])


def main() -> int:
    parser = argparse.ArgumentParser(prog="opencode-personal-agent", description="OpenCode Personal Agent Bot")
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("check", help="Run pre-flight checks")
    sub.add_parser("setup", help="Create .env and storage directories")
    sub.add_parser("start", help="Start the bot")
    sub.add_parser("test", help="Run pytest with coverage")
    args = parser.parse_args()

    if args.command == "check":
        return _cmd_check()
    if args.command == "setup":
        return _cmd_setup()
    if args.command == "start":
        return _cmd_start()
    if args.command == "test":
        return _cmd_test()
    return 1


if __name__ == "__main__":
    sys.exit(main())
