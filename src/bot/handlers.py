"""Telegram bot handlers for commands and messages."""
from __future__ import annotations

import asyncio
import contextlib
import os
import re
import time
from pathlib import Path
from typing import Any

from telegram import Update
from telegram.ext import ContextTypes

from config import Config
from opencode.client import OpenCodeClient
from process.manager import ProcessManager
from security import safe_path
from voice.transcriber import VoiceTranscriber

from .session import SessionStore
from .utils import send_reply


class BotHandlers:
    def __init__(self, config: Config, store: SessionStore, process_manager: ProcessManager) -> None:
        self.config = config
        self.store = store
        self.pm = process_manager
        self.client = OpenCodeClient(config)
        self.transcriber = VoiceTranscriber()

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------
    async def _check_auth(self, update: Update) -> bool:
        """Check if the user is authorized. Replies and returns False if not."""
        chat = update.effective_chat
        if chat is None:
            return False
        if chat.id != self.config.allowed_chat_id:
            if update.effective_message:
                await update.effective_message.reply_text(
                    "Access denied. Your chat ID is not authorized."
                )
            print(f"[auth] unauthorized access from {chat.id}")
            return False
        return True

    async def _get_or_create_session(self, chat_id: int) -> str:
        session_id = self.store.get(chat_id)
        if session_id is None:
            session_id = await self.client.create_session(
                "OpenCode Agents chat",
                self.config.opencode_project_dir,
            )
            self.store.set(chat_id, session_id)
        return session_id

    def _typing_task(self, update: Update) -> asyncio.Task[Any]:
        async def loop() -> None:
            while True:
                if update.effective_chat:
                    await update.effective_chat.send_action(action="typing")
                await asyncio.sleep(4)
        return asyncio.create_task(loop())

    # ------------------------------------------------------------------
    # Commands
    # ------------------------------------------------------------------
    async def cmd_start(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
        if not update.effective_message:
            return
        if not await self._check_auth(update):
            return
        await update.effective_message.reply_text(
            "Welcome to OpenCode Agents Bot!\n\n"
            "I am powered by OpenCode and connect you to AI agents.\n"
            "Commands:\n"
            "/start - Show this message\n"
            "/new - Start a fresh session\n"
            "/status - Show server status\n"
            "/restart - Restart the OpenCode server\n"
            "/help - Show available commands\n\n"
            "You can also send voice messages."
        )

    async def cmd_help(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
        if not update.effective_message:
            return
        if not await self._check_auth(update):
            return
        await update.effective_message.reply_text(
            "*Available Commands*\n\n"
            "/start - Welcome message\n"
            "/new - Clear current session and start fresh\n"
            "/status - Show server status\n"
            "/restart - Restart the OpenCode server\n"
            "/help - This message\n\n"
            "You can also send text, documents, photos, and voice messages.",
            parse_mode="Markdown",
        )

    async def cmd_new(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
        if not update.effective_message or update.effective_chat is None:
            return
        if not await self._check_auth(update):
            return
        chat_id = update.effective_chat.id
        existing = self.store.get(chat_id)
        if existing:
            try:
                await self.client.delete_session(existing)
            except Exception:
                pass
            self.store.delete(chat_id)
        await update.effective_message.reply_text("Session cleared. Starting a fresh conversation.")

    async def cmd_status(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
        if not update.effective_message:
            return
        if not await self._check_auth(update):
            return
        uptime = self.pm.uptime_seconds()
        uptime_str = f"{int(uptime // 60)}m {int(uptime % 60)}s" if uptime is not None else "N/A"
        healthy = await self.pm.is_healthy()
        lines = [
            f"Server: {'running' if healthy else 'unhealthy'}",
            f"Uptime: {uptime_str}",
        ]
        await update.effective_message.reply_text("\n".join(lines))

    async def cmd_restart(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
        if not update.effective_message:
            return
        if not await self._check_auth(update):
            return
        await update.effective_message.reply_text("Restarting OpenCode server...")
        try:
            await self.pm.restart()
            await update.effective_message.reply_text("Server restarted successfully.")
        except Exception as exc:
            await update.effective_message.reply_text(f"Restart failed: {exc}")

    # ------------------------------------------------------------------
    # Text
    # ------------------------------------------------------------------
    async def on_text(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
        if not update.effective_message or update.effective_chat is None:
            return
        if not await self._check_auth(update):
            return
        chat_id = update.effective_chat.id
        text = update.effective_message.text or ""
        if text.startswith("/"):
            return
        if re.match(r"^\^.", text):
            return

        print(f"[bot] text from {chat_id}: {text[:50]}...")
        typing = self._typing_task(update)
        try:
            session_id = await self._get_or_create_session(chat_id)
            response = await self.client.send_message(session_id, text)
            typing.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await typing
            await send_reply(update, response)
        except Exception as exc:
            typing.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await typing
            print(f"[bot] error processing text from {chat_id}: {exc}")
            await update.effective_message.reply_text(
                "Sorry, I encountered an error processing your request.",
                do_quote=True,
            )

    # ------------------------------------------------------------------
    # Photo
    # ------------------------------------------------------------------
    async def on_photo(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
        if not update.effective_message or update.effective_chat is None or not context.bot:
            return
        if not await self._check_auth(update):
            return
        chat_id = update.effective_chat.id
        photos = update.effective_message.photo
        if not photos:
            return
        largest = photos[-1]
        caption = update.effective_message.caption or ""
        file_name = f"photo_{update.effective_message.message_id}.jpg"

        print(f"[bot] photo from {chat_id}: {file_name}")
        typing = self._typing_task(update)
        try:
            file = await context.bot.get_file(largest.file_id)
            file_path = safe_path(file_name, Path("storage/uploads"))
            await file.download_to_drive(str(file_path))

            unix_path = file_path.as_posix()
            prompt = (
                f"User: {caption}\n\nLook at the image at {unix_path} and act on the user's request."
                if caption
                else f"User sent an image: {file_name}\n\nLook at the image at {unix_path} and describe what you see."
            )

            session_id = await self._get_or_create_session(chat_id)
            response = await self.client.send_message(session_id, prompt)
            typing.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await typing
            await send_reply(update, response)
        except Exception as exc:
            typing.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await typing
            print(f"[bot] error processing photo from {chat_id}: {exc}")
            await update.effective_message.reply_text(
                "Sorry, I failed to process the photo.",
                do_quote=True,
            )
        finally:
            with contextlib.suppress(Exception):
                file_path.unlink(missing_ok=True)

    # ------------------------------------------------------------------
    # Document
    # ------------------------------------------------------------------
    async def on_document(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
        if not update.effective_message or update.effective_chat is None or not context.bot:
            return
        if not await self._check_auth(update):
            return
        chat_id = update.effective_chat.id
        doc = update.effective_message.document
        if not doc:
            return
        raw_name = doc.file_name or "document"
        safe_name = re.sub(r'[\\/]', "_", raw_name)
        safe_name = re.sub(r'\.{2,}', "_", safe_name)
        # Block Windows-reserved characters and names
        safe_name = re.sub(r'[:*?"<>|]', "_", safe_name)
        stem, dot, ext = safe_name.partition(".")
        reserved = {"CON", "PRN", "AUX", "NUL", "COM1", "COM2", "COM3", "COM4",
                     "COM5", "COM6", "COM7", "COM8", "COM9", "LPT1", "LPT2",
                     "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9"}
        if stem.upper() in reserved:
            safe_name = f"_{safe_name}"
        safe_name = safe_name or f"file_{int(time.time())}"
        caption = update.effective_message.caption or ""

        print(f"[bot] document from {chat_id}: {safe_name}")
        typing = self._typing_task(update)
        try:
            file = await context.bot.get_file(doc.file_id)
            file_path = safe_path(safe_name, Path("storage/uploads"))
            await file.download_to_drive(str(file_path))

            unix_path = file_path.as_posix()
            prompt = (
                f"User: {caption}\n\nRead the file at {unix_path} and act on the user's request."
                if caption
                else f"User sent a file: {safe_name}\n\nRead the file at {unix_path} and do what seems appropriate."
            )

            session_id = await self._get_or_create_session(chat_id)
            response = await self.client.send_message(session_id, prompt)
            typing.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await typing
            await send_reply(update, response)
        except Exception as exc:
            typing.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await typing
            print(f"[bot] error processing document from {chat_id}: {exc}")
            await update.effective_message.reply_text(
                "Sorry, I failed to process the document.",
                do_quote=True,
            )
        finally:
            with contextlib.suppress(Exception):
                file_path.unlink(missing_ok=True)

    # ------------------------------------------------------------------
    # Voice
    # ------------------------------------------------------------------
    async def on_voice(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
        if not update.effective_message or update.effective_chat is None or not context.bot:
            return
        if not await self._check_auth(update):
            return
        chat_id = update.effective_chat.id
        voice = update.effective_message.voice
        if not voice:
            return
        caption = update.effective_message.caption or ""
        file_name = f"voice_{update.effective_message.message_id}.ogg"

        print(f"[bot] voice from {chat_id}: {voice.file_id}")
        typing = self._typing_task(update)
        try:
            file = await context.bot.get_file(voice.file_id)
            file_path = safe_path(file_name, Path("storage/uploads"))
            await file.download_to_drive(str(file_path))

            text = self.transcriber.transcribe(str(file_path), self.config.whisper_language)

            prompt = (
                f"User: {caption}\n\nTranscription of voice message: {text}"
                if caption
                else f"User sent a voice message. Transcription: {text}"
            )

            session_id = await self._get_or_create_session(chat_id)
            response = await self.client.send_message(session_id, prompt)
            typing.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await typing
            await send_reply(update, response)
        except Exception as exc:
            typing.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await typing
            print(f"[bot] error processing voice from {chat_id}: {exc}")
            await update.effective_message.reply_text(
                "Sorry, I failed to process the voice message.",
                do_quote=True,
            )
        finally:
            with contextlib.suppress(Exception):
                file_path.unlink(missing_ok=True)
