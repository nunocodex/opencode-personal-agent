"""Tests for bot handlers and session store."""
from __future__ import annotations

import asyncio
from pathlib import Path
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from bot.handlers import BotHandlers
from bot.session import SessionStore
from bot.utils import send_reply
from config import Config


class TestSessionStore:
    def test_get_set_delete(self) -> None:
        store = SessionStore()
        assert store.get(1) is None
        store.set(1, "abc")
        assert store.get(1) == "abc"
        store.delete(1)
        assert store.get(1) is None

    def test_clear(self) -> None:
        store = SessionStore()
        store.set(1, "a")
        store.set(2, "b")
        store.clear()
        assert store.get(1) is None
        assert store.get(2) is None


class TestSendReply:
    async def test_short_message(self, mock_update: MagicMock) -> None:
        await send_reply(mock_update, "hello")
        mock_update.effective_message.reply_text.assert_called_once_with(
            "hello",
            reply_to_message_id=None,
        )

    async def test_long_message_split(self, mock_update: MagicMock) -> None:
        long_text = "A" * 5000
        await send_reply(mock_update, long_text)
        assert mock_update.effective_message.reply_text.call_count == 2


class TestBotHandlers:
    @pytest.fixture
    def handlers(self, config: Config) -> BotHandlers:
        store = SessionStore()
        pm = MagicMock()
        h = BotHandlers(config, store, pm)
        h.client.create_session = AsyncMock()
        h.client.send_message = AsyncMock()
        h.client.delete_session = AsyncMock()
        return h

    async def test_cmd_start(self, handlers: BotHandlers, mock_update: MagicMock, mock_context: MagicMock) -> None:
        await handlers.cmd_start(mock_update, mock_context)
        mock_update.effective_message.reply_text.assert_called_once()
        assert "Welcome" in mock_update.effective_message.reply_text.call_args[0][0]

    async def test_cmd_new_no_session(self, handlers: BotHandlers, mock_update: MagicMock, mock_context: MagicMock) -> None:
        await handlers.cmd_new(mock_update, mock_context)
        mock_update.effective_message.reply_text.assert_called_once_with(
            "Session cleared. Starting a fresh conversation."
        )

    async def test_cmd_new_deletes_session(self, handlers: BotHandlers, mock_update: MagicMock, mock_context: MagicMock) -> None:
        handlers.store.set(123456789, "sess-1")
        with patch.object(handlers.client, "delete_session", new_callable=AsyncMock):
            await handlers.cmd_new(mock_update, mock_context)
        assert handlers.store.get(123456789) is None

    async def test_cmd_status(self, handlers: BotHandlers, mock_update: MagicMock, mock_context: MagicMock) -> None:
        handlers.pm.uptime_seconds.return_value = 125
        handlers.pm.is_healthy = AsyncMock(return_value=True)
        await handlers.cmd_status(mock_update, mock_context)
        text = mock_update.effective_message.reply_text.call_args[0][0]
        assert "running" in text
        assert "2m 5s" in text

    async def test_cmd_restart(self, handlers: BotHandlers, mock_update: MagicMock, mock_context: MagicMock) -> None:
        handlers.pm.restart = AsyncMock()
        await handlers.cmd_restart(mock_update, mock_context)
        handlers.pm.restart.assert_awaited_once()

    async def test_on_text_skips_commands(self, handlers: BotHandlers, mock_update: MagicMock, mock_context: MagicMock) -> None:
        mock_update.effective_message.text = "/start"
        await handlers.on_text(mock_update, mock_context)
        handlers.client.send_message.assert_not_called()

    async def test_on_text_skips_caret(self, handlers: BotHandlers, mock_update: MagicMock, mock_context: MagicMock) -> None:
        mock_update.effective_message.text = "^C"
        await handlers.on_text(mock_update, mock_context)
        handlers.client.send_message.assert_not_called()

    async def test_on_text_flow(self, handlers: BotHandlers, mock_update: MagicMock, mock_context: MagicMock) -> None:
        mock_update.effective_message.text = "hello ai"
        handlers.client.create_session = AsyncMock(return_value="sess-new")
        handlers.client.send_message = AsyncMock(return_value="response text")
        await handlers.on_text(mock_update, mock_context)
        handlers.client.send_message.assert_awaited_once()

    async def test_on_voice(self, handlers: BotHandlers, mock_update: MagicMock, mock_context: MagicMock) -> None:
        voice = MagicMock()
        voice.file_id = "voice-id"
        mock_update.effective_message.voice = voice
        file_mock = MagicMock()
        file_mock.download_to_drive = AsyncMock()
        mock_context.bot.get_file = AsyncMock(return_value=file_mock)
        handlers.transcriber.transcribe = MagicMock(return_value="transcribed text")
        handlers.client.send_message = AsyncMock(return_value="response")
        await handlers.on_voice(mock_update, mock_context)
        handlers.transcriber.transcribe.assert_called_once()
        handlers.client.send_message.assert_awaited_once()

    async def test_on_photo(self, handlers: BotHandlers, mock_update: MagicMock, mock_context: MagicMock) -> None:
        photo = MagicMock()
        photo.file_id = "photo-id"
        mock_update.effective_message.photo = [photo]
        file_mock = MagicMock()
        file_mock.download_to_drive = AsyncMock()
        mock_context.bot.get_file = AsyncMock(return_value=file_mock)
        handlers.client.send_message = AsyncMock(return_value="response")
        await handlers.on_photo(mock_update, mock_context)
        handlers.client.send_message.assert_awaited_once()

    async def test_on_document(self, handlers: BotHandlers, mock_update: MagicMock, mock_context: MagicMock) -> None:
        doc = MagicMock()
        doc.file_id = "doc-id"
        doc.file_name = "report.pdf"
        mock_update.effective_message.document = doc
        file_mock = MagicMock()
        file_mock.download_to_drive = AsyncMock()
        mock_context.bot.get_file = AsyncMock(return_value=file_mock)
        handlers.client.send_message = AsyncMock(return_value="response")
        await handlers.on_document(mock_update, mock_context)
        handlers.client.send_message.assert_awaited_once()
