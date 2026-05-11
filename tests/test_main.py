"""Tests for main entry point."""
from __future__ import annotations

import asyncio
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from config import Config


class TestMain:
    async def test_start_bot_lifecycle(self, config: Config) -> None:
        event = asyncio.Event()
        with patch("main.run_checks", return_value=config):
            with patch("main.ProcessManager") as MockPM:
                pm = MagicMock()
                pm.start = AsyncMock()
                pm.stop = AsyncMock()
                pm.close = AsyncMock()
                MockPM.return_value = pm
                with patch("main.build_app") as mock_build_app:
                    app = MagicMock()
                    app.initialize = AsyncMock()
                    app.start = AsyncMock()
                    app.stop = AsyncMock()
                    app.shutdown = AsyncMock()
                    # Updater mock
                    updater = MagicMock()
                    updater.start_polling = AsyncMock()
                    updater.stop = AsyncMock()
                    app.updater = updater
                    handlers_mock = MagicMock()
                    handlers_mock.close = AsyncMock()
                    media_mock = MagicMock()
                    mock_build_app.return_value = (app, handlers_mock, media_mock)
                    with patch("main.signal.signal"):
                        with patch("main.asyncio.Event", return_value=event):
                            task = asyncio.create_task(self._run_main())
                            await asyncio.sleep(0.05)
                            event.set()
                            await task
        pm.start.assert_awaited_once()
        pm.stop.assert_awaited_once()
        pm.close.assert_awaited_once()
        app.initialize.assert_awaited_once()
        app.updater.start_polling.assert_awaited_once()
        app.start.assert_awaited_once()
        handlers_mock.close.assert_awaited_once()
        app.updater.stop.assert_awaited_once()
        app.stop.assert_awaited_once()
        app.shutdown.assert_awaited_once()

    async def _run_main(self) -> None:
        from main import start_bot
        await start_bot()
