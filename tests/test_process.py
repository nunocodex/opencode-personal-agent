"""Tests for ProcessManager lifecycle."""
from __future__ import annotations

import asyncio
import sys
from pathlib import Path
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from config import Config
from process.manager import ProcessManager


class DummyProcess:
    def __init__(self, returncode: int | None = None) -> None:
        self.returncode = returncode
        self._killed = False
        self.stdout = None
        self.stderr = None

    async def wait(self) -> int:
        while self.returncode is None:
            await asyncio.sleep(0.01)
        return self.returncode or 0

    def kill(self) -> None:
        self._killed = True
        self.returncode = -9

    def send_signal(self, sig: int) -> None:
        if sig == 15 or (sys.platform == "win32" and sig == 2):
            self.returncode = 0


class TestProcessManager:
    @pytest.fixture
    def pm(self, config: Config) -> ProcessManager:
        return ProcessManager(config)

    async def test_start_checks_health(self, pm: ProcessManager, config: Config) -> None:
        dummy = DummyProcess(returncode=None)
        with patch("asyncio.create_subprocess_exec", new_callable=AsyncMock, return_value=dummy):
            with patch.object(pm, "is_healthy", new_callable=AsyncMock, return_value=True):
                await pm.start()
                assert pm._process is dummy
        # cleanup
        dummy.returncode = 0
        await pm.stop()

    async def test_start_already_healthy(self, pm: ProcessManager) -> None:
        dummy = DummyProcess(returncode=None)
        pm._process = dummy
        with patch.object(pm, "is_healthy", new_callable=AsyncMock, return_value=True):
            await pm.start()
        dummy.returncode = 0
        await pm.stop()

    async def test_start_unhealthy_raises(self, pm: ProcessManager) -> None:
        dummy = DummyProcess(returncode=None)
        with patch("asyncio.create_subprocess_exec", new_callable=AsyncMock, return_value=dummy):
            with patch.object(pm, "is_healthy", new_callable=AsyncMock, return_value=False):
                with pytest.raises(RuntimeError, match="not responding"):
                    await pm.start()
        dummy.returncode = 0

    async def test_stop_graceful(self, pm: ProcessManager) -> None:
        dummy = DummyProcess(returncode=None)
        pm._process = dummy
        pm._start_time = asyncio.get_event_loop().time()
        task = asyncio.create_task(pm.stop())
        await asyncio.sleep(0.1)
        dummy.returncode = 0
        await task
        assert pm._process is None

    async def test_stop_force_kill(self, pm: ProcessManager) -> None:
        dummy = DummyProcess(returncode=None)
        pm._process = dummy
        pm._start_time = asyncio.get_event_loop().time()
        await pm.stop()
        assert dummy._killed
        assert pm._process is None

    async def test_restart(self, pm: ProcessManager) -> None:
        dummy = DummyProcess(returncode=None)
        with patch("asyncio.create_subprocess_exec", new_callable=AsyncMock, return_value=dummy):
            with patch.object(pm, "is_healthy", new_callable=AsyncMock, return_value=True):
                await pm.restart()
        dummy.returncode = 0
        await pm.stop()

    async def test_is_healthy_true(self, pm: ProcessManager) -> None:
        with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = MagicMock(status_code=200)
            assert await pm.is_healthy() is True

    async def test_is_healthy_false(self, pm: ProcessManager) -> None:
        with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
            mock_get.side_effect = Exception("boom")
            assert await pm.is_healthy() is False

    def test_uptime_seconds(self, pm: ProcessManager) -> None:
        import time
        assert pm.uptime_seconds() is None
        pm._start_time = time.monotonic() - 10
        assert pm.uptime_seconds() is not None
        assert pm.uptime_seconds() >= 10
