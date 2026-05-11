"""Telegram bot handlers for commands and text messages."""
from __future__ import annotations

import asyncio
import contextlib
import re
import time
from pathlib import Path
from typing import Any

from telegram import Update
from telegram.ext import ContextTypes

from config import Config
from opencode.client import OpenCodeClient
from process.manager import ProcessManager

from .session import SessionStore
from .utils import send_reply, typing_scope


class BotHandlers:
    """Handles commands and text messages."""

    def __init__(self, config: Config, store: SessionStore, process_manager: ProcessManager) -> None:
        self.config = config
        self.store = store
        self.pm = process_manager
        self.client = OpenCodeClient(config)
        self._last_request_time: float = 0.0
        self._min_interval: float = getattr(config, "rate_limit_seconds", 2.0)

    async def close(self) -> None:
        """Release HTTP client resources."""
        await self.client.close()

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
                    "Access denied. Your chat ID is not authorized.",
                    parse_mode="Markdown",
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

    async def _check_rate_limit(self, update: Update) -> bool:
        """Reject requests that come too quickly. Returns False if rate limited."""
        now = time.monotonic()
        elapsed = now - self._last_request_time
        if elapsed < self._min_interval:
            if update.effective_message:
                await update.effective_message.reply_text(
                    f"Please wait {self._min_interval:.0f}s between requests.",
                    parse_mode="Markdown",
                )
            return False
        self._last_request_time = now
        return True

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
            "You can also send voice messages.",
            parse_mode="Markdown",
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
        await update.effective_message.reply_text("Session cleared. Starting a fresh conversation.", parse_mode="Markdown")

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
        await update.effective_message.reply_text("\n".join(lines), parse_mode="Markdown")

    async def cmd_restart(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
        if not update.effective_message:
            return
        if not await self._check_auth(update):
            return
        await update.effective_message.reply_text("Restarting OpenCode server...", parse_mode="Markdown")
        try:
            await self.pm.restart()
            await update.effective_message.reply_text("Server restarted successfully.", parse_mode="Markdown")
        except Exception:
            print(f"[bot] restart failed")
            await update.effective_message.reply_text("Restart failed. Check logs for details.", parse_mode="Markdown")

    # ------------------------------------------------------------------
    # Text
    # ------------------------------------------------------------------
    async def on_text(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
        if not update.effective_message or update.effective_chat is None:
            return
        if not await self._check_auth(update):
            return
        if not await self._check_rate_limit(update):
            return
        chat_id = update.effective_chat.id
        text = update.effective_message.text or ""
        if text.startswith("/"):
            return
        if re.match(r"^\^.", text):
            return

        print(f"[bot] text from {chat_id}: {text[:50]}...")
        async with typing_scope(update):
            try:
                session_id = await self._get_or_create_session(chat_id)
                response = await self.client.send_message(session_id, text)
            except Exception as exc:
                print(f"[bot] error processing text from {chat_id}: {exc}")
                await update.effective_message.reply_text(
                    "Sorry, I encountered an error processing your request.",
                    parse_mode="Markdown",
                    do_quote=True,
                )
                return
            await send_reply(update, response)
