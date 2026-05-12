"""Entry point: bootstrap and start bot."""
from __future__ import annotations

import asyncio
import contextlib
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
from process.monitor import HealthMonitor


async def start_bot() -> None:
    config = run_checks()
    pm = ProcessManager(config)
    monitor = HealthMonitor(config, pm)

    await pm.start()
    await monitor.start(interval=60.0)

    app, handlers, media = build_app(config, pm, monitor)

    shutdown_event = asyncio.Event()

    def _signal_handler(sig: int, frame: Any) -> None:
        print(f"\n[main] received signal {sig}, shutting down...")
        shutdown_event.set()

    signal.signal(signal.SIGINT, _signal_handler)
    signal.signal(signal.SIGTERM, _signal_handler)

    try:
        await app.initialize()
        await app.updater.start_polling()
        await app.start()
        print("Telegram bot started. Press Ctrl+C to stop.")

        # Wait for shutdown or restart signal
        poll_task = asyncio.create_task(shutdown_event.wait())
        restart_task = asyncio.create_task(monitor.restart_event.wait())

        done, _ = await asyncio.wait(
            [poll_task, restart_task],
            return_when=asyncio.FIRST_COMPLETED,
        )

        if restart_task in done:
            print("[main] Telegram unreachable for too long, restarting polling...")
            await app.updater.stop()
            # Wait for connectivity to return
            while not await monitor.check_telegram():
                print("[main] waiting for Telegram connectivity...")
                await asyncio.sleep(30)
            await app.updater.start_polling()
            await app.start()
            print("[main] polling restarted.")
            # Re-enter wait loop
            poll_task = asyncio.create_task(shutdown_event.wait())
            restart_task = asyncio.create_task(monitor.restart_event.wait())
            await asyncio.wait(
                [poll_task, restart_task],
                return_when=asyncio.FIRST_COMPLETED,
            )
    finally:
        print("[main] stopping bot...")
        for step in [app.updater.stop, app.stop, app.shutdown, handlers.close, monitor.stop, pm.close, pm.stop]:
            try:
                await step()
            except Exception as exc:
                print(f"[main] cleanup warning: {exc}")
        print("[main] shutdown complete.")


if __name__ == "__main__":
    try:
        asyncio.run(start_bot())
    except KeyboardInterrupt:
        print("\nStopped.")
        sys.exit(0)
