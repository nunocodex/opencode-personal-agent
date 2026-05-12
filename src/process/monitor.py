"""Health monitor for bot services: Telegram API and OpenCode server."""
from __future__ import annotations

import asyncio
import contextlib

import httpx

from config import Config
from process.manager import ProcessManager


class HealthMonitor:
    def __init__(self, config: Config, process_manager: ProcessManager) -> None:
        self.config = config
        self.pm = process_manager
        self._telegram_ok: bool | None = None
        self._opencode_ok: bool | None = None
        self._telegram_failures: int = 0
        self.max_failures: int = 3
        self.restart_event = asyncio.Event()
        self._task: asyncio.Task[None] | None = None
        self._client: httpx.AsyncClient | None = None

    @property
    def telegram_ok(self) -> bool | None:
        return self._telegram_ok

    @property
    def opencode_ok(self) -> bool | None:
        return self._opencode_ok

    @property
    def telegram_failures(self) -> int:
        return self._telegram_failures

    async def check_telegram(self) -> bool:
        if self._client is None:
            self._client = httpx.AsyncClient(timeout=httpx.Timeout(10.0))
        try:
            resp = await self._client.get(
                f"https://api.telegram.org/bot{self.config.telegram_bot_token}/getMe"
            )
            ok = 200 <= resp.status_code < 300
        except Exception:
            ok = False

        self._telegram_ok = ok
        if ok:
            self._telegram_failures = 0
            self.restart_event.clear()
        else:
            self._telegram_failures += 1
            if self._telegram_failures >= self.max_failures:
                self.restart_event.set()
        return ok

    async def check_opencode(self) -> bool:
        ok = await self.pm.is_healthy()
        self._opencode_ok = ok
        return ok

    async def run(self, interval: float = 60.0) -> None:
        while True:
            await self.check_telegram()
            opencode_ok = await self.check_opencode()
            if not opencode_ok:
                print("[HealthMonitor] opencode unhealthy, restarting...")
                await self.pm.restart()
            try:
                await asyncio.sleep(interval)
            except asyncio.CancelledError:
                break

    async def start(self, interval: float = 60.0) -> None:
        self._task = asyncio.create_task(self.run(interval))

    async def stop(self) -> None:
        if self._task is not None:
            self._task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._task
            self._task = None
        if self._client is not None:
            await self._client.aclose()
            self._client = None
