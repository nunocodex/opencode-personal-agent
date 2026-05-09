"""Tests for PTB app builder."""
from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from bot.app import _auth_middleware, build_app
from config import Config


class TestAuthMiddleware:
    async def test_allows_authorized(self, config: Config) -> None:
        update = MagicMock()
        update.effective_chat = MagicMock()
        update.effective_chat.id = config.allowed_chat_id
        ctx = MagicMock()
        result = await _auth_middleware(update, ctx, config.allowed_chat_id)
        assert result is True

    async def test_blocks_unauthorized(self, config: Config) -> None:
        update = MagicMock()
        update.effective_chat = MagicMock()
        update.effective_chat.id = 999
        update.effective_message = MagicMock()
        update.effective_message.reply_text = AsyncMock()
        ctx = MagicMock()
        result = await _auth_middleware(update, ctx, config.allowed_chat_id)
        assert result is False
        update.effective_message.reply_text.assert_awaited_once()

    async def test_no_chat(self, config: Config) -> None:
        update = MagicMock()
        update.effective_chat = None
        ctx = MagicMock()
        result = await _auth_middleware(update, ctx, config.allowed_chat_id)
        assert result is False


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
