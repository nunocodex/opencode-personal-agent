"""Tests for HealthMonitor."""
from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from config import Config
from process.manager import ProcessManager
from process.monitor import HealthMonitor


class TestHealthMonitor:
    @pytest.fixture
    def pm(self, config: Config) -> ProcessManager:
        return ProcessManager(config)

    @pytest.fixture
    def monitor(self, config: Config, pm: ProcessManager) -> HealthMonitor:
        return HealthMonitor(config, pm)

    # ------------------------------------------------------------------
    # check_telegram
    # ------------------------------------------------------------------
    async def test_check_telegram_ok(self, monitor: HealthMonitor) -> None:
        with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = MagicMock(status_code=200)
            result = await monitor.check_telegram()
        assert result is True

    async def test_check_telegram_network_error(self, monitor: HealthMonitor) -> None:
        with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
            mock_get.side_effect = httpx.ConnectError("connection refused")
            result = await monitor.check_telegram()
        assert result is False

    async def test_check_telegram_non_200(self, monitor: HealthMonitor) -> None:
        with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = MagicMock(status_code=401)
            result = await monitor.check_telegram()
        assert result is False

    # ------------------------------------------------------------------
    # check_opencode
    # ------------------------------------------------------------------
    async def test_check_opencode_delegates_to_pm(self, monitor: HealthMonitor, pm: ProcessManager) -> None:
        with patch.object(pm, "is_healthy", new_callable=AsyncMock, return_value=True):
            result = await monitor.check_opencode()
        assert result is True

    async def test_check_opencode_returns_false_when_unhealthy(self, monitor: HealthMonitor, pm: ProcessManager) -> None:
        with patch.object(pm, "is_healthy", new_callable=AsyncMock, return_value=False):
            result = await monitor.check_opencode()
        assert result is False

    # ------------------------------------------------------------------
    # properties
    # ------------------------------------------------------------------
    async def test_initial_state(self, monitor: HealthMonitor) -> None:
        assert monitor.telegram_ok is None
        assert monitor.opencode_ok is None
        assert monitor.telegram_failures == 0

    async def test_properties_reflect_last_check(self, monitor: HealthMonitor) -> None:
        with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = MagicMock(status_code=200)
            await monitor.check_telegram()
        assert monitor.telegram_ok is True
        assert monitor.telegram_failures == 0

    async def test_failure_increments_counter(self, monitor: HealthMonitor) -> None:
        with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
            mock_get.side_effect = httpx.ConnectError("fail")
            await monitor.check_telegram()
        assert monitor.telegram_ok is False
        assert monitor.telegram_failures == 1

        await monitor.check_telegram()
        assert monitor.telegram_failures == 2

    async def test_success_resets_failure_counter(self, monitor: HealthMonitor) -> None:
        with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
            mock_get.side_effect = httpx.ConnectError("fail")
            await monitor.check_telegram()

        assert monitor.telegram_failures == 1

        with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = MagicMock(status_code=200)
            await monitor.check_telegram()

        assert monitor.telegram_failures == 0
        assert monitor.telegram_ok is True

    # ------------------------------------------------------------------
    # restart_event
    # ------------------------------------------------------------------
    async def test_max_failures_sets_event(self, monitor: HealthMonitor) -> None:
        with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
            mock_get.side_effect = httpx.ConnectError("fail")
            for _ in range(monitor.max_failures):
                await monitor.check_telegram()
        assert monitor.restart_event.is_set() is True

    async def test_event_not_set_below_threshold(self, monitor: HealthMonitor) -> None:
        with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
            mock_get.side_effect = httpx.ConnectError("fail")
            for _ in range(monitor.max_failures - 1):
                await monitor.check_telegram()
        assert monitor.restart_event.is_set() is False

    # ------------------------------------------------------------------
    # run loop
    # ------------------------------------------------------------------
    async def test_run_check_interval(self, monitor: HealthMonitor) -> None:
        """Run should call check_telegram and check_opencode periodically."""
        with (
            patch.object(monitor, "check_telegram", new_callable=AsyncMock, return_value=True),
            patch.object(monitor, "check_opencode", new_callable=AsyncMock, return_value=True),
        ):
            task = asyncio.create_task(monitor.run(interval=0.05))
            await asyncio.sleep(0.12)
            await monitor.stop()
            assert monitor.check_telegram.call_count >= 1
            assert monitor.check_opencode.call_count >= 1

    async def test_unhealthy_opencode_triggers_restart(self, monitor: HealthMonitor, pm: ProcessManager) -> None:
        with (
            patch.object(monitor, "check_telegram", new_callable=AsyncMock, return_value=True),
            patch.object(pm, "is_healthy", new_callable=AsyncMock, return_value=False),
            patch.object(pm, "restart", new_callable=AsyncMock) as mock_restart,
        ):
            task = asyncio.create_task(monitor.run(interval=0.05))
            await asyncio.sleep(0.12)
            await monitor.stop()

        mock_restart.assert_called()

    # ------------------------------------------------------------------
    # start / stop lifecycle
    # ------------------------------------------------------------------
    async def test_start_stop_lifecycle(self, monitor: HealthMonitor) -> None:
        with (
            patch.object(monitor, "check_telegram", new_callable=AsyncMock, return_value=True),
            patch.object(monitor, "check_opencode", new_callable=AsyncMock, return_value=True),
        ):
            await monitor.start(interval=0.1)
            assert monitor._task is not None
            assert monitor._task.done() is False

            await monitor.stop()
            assert monitor._task is None

    async def test_stop_idempotent(self, monitor: HealthMonitor) -> None:
        await monitor.stop()
        await monitor.stop()
