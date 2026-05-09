"""Tests for PTB app builder."""
from __future__ import annotations

from unittest.mock import MagicMock, patch

from bot.app import build_app
from config import Config


class TestBuildApp:
    def test_build_app_registers_handlers(self, config: Config) -> None:
        pm = MagicMock()
        with patch("bot.app.Application.builder") as mock_builder:
            app_instance = MagicMock()
            mock_builder.return_value.token.return_value.build.return_value = app_instance
            app = build_app(config, pm)
            assert app is app_instance
            # Should have called add_handler multiple times
            assert app.add_handler.call_count >= 9
