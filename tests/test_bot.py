"""Tests for bot handlers, media handler, and session store."""
from __future__ import annotations

import asyncio
from pathlib import Path
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from bot.handlers import BotHandlers
from bot.media_handler import MediaHandler
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
            parse_mode="Markdown",
            do_quote=True,
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
            "Session cleared. Starting a fresh conversation.",
            parse_mode="Markdown",
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


class TestMediaHandler:
    @pytest.fixture
    def media(self, config: Config) -> MediaHandler:
        store = SessionStore()
        client = MagicMock()
        client.create_session = AsyncMock()
        client.send_message = AsyncMock()
        client.send_message_cli = AsyncMock()
        client.delete_session = AsyncMock()
        transcriber = MagicMock()
        return MediaHandler(config, client, store, transcriber)

    async def test_on_voice(self, media: MediaHandler, mock_update: MagicMock, mock_context: MagicMock) -> None:
        voice = MagicMock()
        voice.file_id = "voice-id"
        voice.file_size = 1024
        mock_update.effective_message.voice = voice
        file_mock = MagicMock()
        file_mock.download_to_drive = AsyncMock()
        mock_context.bot.get_file = AsyncMock(return_value=file_mock)
        media.transcriber.transcribe = MagicMock(return_value="transcribed text")
        media.client.send_message = AsyncMock(return_value="response")
        await media.on_voice(mock_update, mock_context)
        media.transcriber.transcribe.assert_called_once()
        media.client.send_message.assert_awaited_once()

    async def test_on_photo(self, media: MediaHandler, mock_update: MagicMock, mock_context: MagicMock) -> None:
        photo = MagicMock()
        photo.file_id = "photo-id"
        photo.file_size = 1024
        mock_update.effective_message.photo = [photo]
        file_mock = MagicMock()
        file_mock.download_to_drive = AsyncMock()
        mock_context.bot.get_file = AsyncMock(return_value=file_mock)
        media.client.send_message_cli = AsyncMock(return_value="Foto ricevuta. Analizzo l'immagine...")
        await media.on_photo(mock_update, mock_context)
        media.client.send_message_cli.assert_awaited_once()

    async def test_on_document(self, media: MediaHandler, mock_update: MagicMock, mock_context: MagicMock) -> None:
        doc = MagicMock()
        doc.file_id = "doc-id"
        doc.file_name = "report.pdf"
        doc.file_size = 1024
        mock_update.effective_message.document = doc
        file_mock = MagicMock()
        file_mock.download_to_drive = AsyncMock()
        mock_context.bot.get_file = AsyncMock(return_value=file_mock)
        media.client.send_message_cli = AsyncMock(return_value="Documento ricevuto. Analizzo il file...")
        await media.on_document(mock_update, mock_context)
        media.client.send_message_cli.assert_awaited_once()

    async def test_on_photo_prompt_no_delegation(self, media: MediaHandler, mock_update: MagicMock, mock_context: MagicMock) -> None:
        photo = MagicMock()
        photo.file_id = "photo-id"
        photo.file_size = 1024
        mock_update.effective_message.photo = [photo]
        mock_update.effective_message.caption = "test caption"
        file_mock = MagicMock()
        file_mock.download_to_drive = AsyncMock()
        mock_context.bot.get_file = AsyncMock(return_value=file_mock)
        media.client.send_message_cli = AsyncMock(return_value="description")
        await media.on_photo(mock_update, mock_context)
        prompt = media.client.send_message_cli.call_args[0][0]
        assert "attached" in prompt.lower()

    async def test_on_photo_passes_file_paths(self, media: MediaHandler, mock_update: MagicMock, mock_context: MagicMock) -> None:
        photo = MagicMock()
        photo.file_id = "photo-id"
        photo.file_size = 1024
        mock_update.effective_message.photo = [photo]
        mock_update.effective_message.caption = ""
        file_mock = MagicMock()
        file_mock.download_to_drive = AsyncMock()
        mock_context.bot.get_file = AsyncMock(return_value=file_mock)
        media.client.send_message_cli = AsyncMock(return_value="description")
        await media.on_photo(mock_update, mock_context)
        kwargs = media.client.send_message_cli.call_args[1]
        assert "file_paths" in kwargs
        assert len(kwargs["file_paths"]) == 1

    async def test_on_photo_paths_uses_safe_path(self, media: MediaHandler, mock_update: MagicMock, mock_context: MagicMock) -> None:
        photo = MagicMock()
        photo.file_id = "photo-id"
        photo.file_size = 1024
        mock_update.effective_message.photo = [photo]
        mock_update.effective_message.caption = "test caption"
        file_mock = MagicMock()
        file_mock.download_to_drive = AsyncMock()
        mock_context.bot.get_file = AsyncMock(return_value=file_mock)
        media.client.send_message_cli = AsyncMock(return_value="description")
        await media.on_photo(mock_update, mock_context)
        kwargs = media.client.send_message_cli.call_args[1]
        path = kwargs["file_paths"][0]
        assert "uploads" in path
        assert path.endswith(".jpg")

    async def test_on_document_prompt_no_delegation(self, media: MediaHandler, mock_update: MagicMock, mock_context: MagicMock) -> None:
        doc = MagicMock()
        doc.file_id = "doc-id"
        doc.file_name = "report.pdf"
        doc.file_size = 1024
        mock_update.effective_message.document = doc
        mock_update.effective_message.caption = "analyze this"
        file_mock = MagicMock()
        file_mock.download_to_drive = AsyncMock()
        mock_context.bot.get_file = AsyncMock(return_value=file_mock)
        media.client.send_message_cli = AsyncMock(return_value="summary")
        await media.on_document(mock_update, mock_context)
        prompt = media.client.send_message_cli.call_args[0][0]
        assert "attached" in prompt.lower()

    async def test_on_document_passes_file_paths(self, media: MediaHandler, mock_update: MagicMock, mock_context: MagicMock) -> None:
        doc = MagicMock()
        doc.file_id = "doc-id"
        doc.file_name = "report.pdf"
        doc.file_size = 1024
        mock_update.effective_message.document = doc
        mock_update.effective_message.caption = ""
        file_mock = MagicMock()
        file_mock.download_to_drive = AsyncMock()
        mock_context.bot.get_file = AsyncMock(return_value=file_mock)
        media.client.send_message_cli = AsyncMock(return_value="summary")
        await media.on_document(mock_update, mock_context)
        kwargs = media.client.send_message_cli.call_args[1]
        assert "file_paths" in kwargs
        assert len(kwargs["file_paths"]) == 1


class TestAuthCheck:
    """Verify per-handler auth blocks unauthorized users."""

    @pytest.fixture
    def handlers(self, config: Config) -> BotHandlers:
        store = SessionStore()
        pm = MagicMock()
        h = BotHandlers(config, store, pm)
        h.client.create_session = AsyncMock()
        h.client.send_message = AsyncMock()
        h.client.delete_session = AsyncMock()
        return h

    @pytest.fixture
    def media(self, config: Config) -> MediaHandler:
        store = SessionStore()
        client = MagicMock()
        client.create_session = AsyncMock()
        client.send_message = AsyncMock()
        client.send_message_cli = AsyncMock()
        client.delete_session = AsyncMock()
        transcriber = MagicMock()
        return MediaHandler(config, client, store, transcriber)

    @pytest.fixture
    def unauth_update(self) -> MagicMock:
        update = MagicMock()
        update.effective_chat = MagicMock()
        update.effective_chat.id = 99999  # not equal to allowed_chat_id
        update.effective_chat.send_action = AsyncMock()
        update.effective_message = MagicMock()
        update.effective_message.message_id = 1
        update.effective_message.text = "hello"
        update.effective_message.caption = ""
        update.effective_message.photo = []
        update.effective_message.document = None
        update.effective_message.voice = None
        update.effective_message.reply_text = AsyncMock()
        return update

    async def test_cmd_start_blocked(self, handlers: BotHandlers, unauth_update: MagicMock, mock_context: MagicMock) -> None:
        await handlers.cmd_start(unauth_update, mock_context)
        calls = [c[0][0] for c in unauth_update.effective_message.reply_text.call_args_list]
        assert any("Access denied" in c for c in calls)

    async def test_cmd_help_blocked(self, handlers: BotHandlers, unauth_update: MagicMock, mock_context: MagicMock) -> None:
        await handlers.cmd_help(unauth_update, mock_context)
        calls = [c[0][0] for c in unauth_update.effective_message.reply_text.call_args_list]
        assert any("Access denied" in c for c in calls)

    async def test_cmd_new_blocked(self, handlers: BotHandlers, unauth_update: MagicMock, mock_context: MagicMock) -> None:
        await handlers.cmd_new(unauth_update, mock_context)
        calls = [c[0][0] for c in unauth_update.effective_message.reply_text.call_args_list]
        assert any("Access denied" in c for c in calls)

    async def test_cmd_status_blocked(self, handlers: BotHandlers, unauth_update: MagicMock, mock_context: MagicMock) -> None:
        await handlers.cmd_status(unauth_update, mock_context)
        calls = [c[0][0] for c in unauth_update.effective_message.reply_text.call_args_list]
        assert any("Access denied" in c for c in calls)

    async def test_cmd_restart_blocked(self, handlers: BotHandlers, unauth_update: MagicMock, mock_context: MagicMock) -> None:
        await handlers.cmd_restart(unauth_update, mock_context)
        handlers.pm.restart.assert_not_called()
        calls = [c[0][0] for c in unauth_update.effective_message.reply_text.call_args_list]
        assert any("Access denied" in c for c in calls)

    async def test_on_text_blocked(self, handlers: BotHandlers, unauth_update: MagicMock, mock_context: MagicMock) -> None:
        unauth_update.effective_message.text = "hello"
        await handlers.on_text(unauth_update, mock_context)
        handlers.client.send_message.assert_not_called()
        calls = [c[0][0] for c in unauth_update.effective_message.reply_text.call_args_list]
        assert any("Access denied" in c for c in calls)

    async def test_on_photo_blocked(self, media: MediaHandler, unauth_update: MagicMock, mock_context: MagicMock) -> None:
        photo = MagicMock()
        photo.file_id = "photo-id"
        unauth_update.effective_message.photo = [photo]
        mock_context.bot.get_file = AsyncMock()
        await media.on_photo(unauth_update, mock_context)
        media.client.send_message.assert_not_called()
        calls = [c[0][0] for c in unauth_update.effective_message.reply_text.call_args_list]
        assert any("Access denied" in c for c in calls)

    async def test_on_document_blocked(self, media: MediaHandler, unauth_update: MagicMock, mock_context: MagicMock) -> None:
        doc = MagicMock()
        doc.file_id = "doc-id"
        doc.file_name = "doc.pdf"
        unauth_update.effective_message.document = doc
        mock_context.bot.get_file = AsyncMock()
        await media.on_document(unauth_update, mock_context)
        media.client.send_message.assert_not_called()
        calls = [c[0][0] for c in unauth_update.effective_message.reply_text.call_args_list]
        assert any("Access denied" in c for c in calls)

    async def test_on_voice_blocked(self, media: MediaHandler, unauth_update: MagicMock, mock_context: MagicMock) -> None:
        voice = MagicMock()
        voice.file_id = "voice-id"
        unauth_update.effective_message.voice = voice
        mock_context.bot.get_file = AsyncMock()
        await media.on_voice(unauth_update, mock_context)
        media.client.send_message.assert_not_called()
        calls = [c[0][0] for c in unauth_update.effective_message.reply_text.call_args_list]
        assert any("Access denied" in c for c in calls)
