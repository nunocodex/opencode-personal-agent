"""Entry point: bootstrap and start bot."""
from __future__ import annotations

import asyncio
import signal
import sys
from pathlib import Path
from typing import Any

# Ensure src/ is on path when run directly
_SRC = str(Path(__file__).parent)
if _SRC not in sys.path:
    sys.path.insert(0, _SRC)

from bootstrap import run_checks
from bot.app import build_app
from process.manager import ProcessManager


async def start_bot() -> None:
    config = run_checks()
    pm = ProcessManager(config)

    await pm.start()

    app = build_app(config, pm)

    shutdown_event = asyncio.Event()

    def _signal_handler(sig: int, frame: Any) -> None:
        print(f"\n[main] received signal {sig}, shutting down...")
        shutdown_event.set()

    signal.signal(signal.SIGINT, _signal_handler)
    signal.signal(signal.SIGTERM, _signal_handler)

    await app.initialize()
    await app.start()
    print("Telegram bot started. Press Ctrl+C to stop.")

    # Block until signal
    await shutdown_event.wait()

    print("[main] stopping bot...")
    await app.stop()
    await app.shutdown()
    await pm.stop()
    print("[main] shutdown complete.")


if __name__ == "__main__":
    try:
        asyncio.run(start_bot())
    except KeyboardInterrupt:
        print("\nStopped.")
        sys.exit(0)
