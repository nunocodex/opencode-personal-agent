"""Bot utility functions: reply helpers, auth, typing indicator."""
from __future__ import annotations

import asyncio
import contextlib
import re
from typing import Any

from telegram import Update
from telegram.ext import ContextTypes

from config import Config


def _escape_md(text: str) -> str:
    """Escape characters that break Telegram Markdown v1 parsing."""
    for ch in ("_", "*", "`", "[", "]"):
        text = text.replace(ch, f"\\{ch}")
    return text


async def check_auth(update: Update, config: Config) -> bool:
    """Check if the user is authorized. Replies and returns False if not."""
    chat = update.effective_chat
    if chat is None:
        return False
    if chat.id != config.allowed_chat_id:
        if update.effective_message:
            await update.effective_message.reply_text(
                "Access denied. Your chat ID is not authorized.",
                parse_mode="Markdown",
            )
        print(f"[auth] unauthorized access from {chat.id}")
        return False
    return True


def create_typing_task(update: Update) -> asyncio.Task[Any]:
    """Start a background task that sends typing indicator every 4s."""
    async def loop() -> None:
        while True:
            if update.effective_chat:
                await update.effective_chat.send_action(action="typing")
            await asyncio.sleep(4)
    return asyncio.create_task(loop())


@contextlib.asynccontextmanager
async def typing_scope(update: Update):
    """Context manager that shows typing indicator for the duration of the block."""
    task = create_typing_task(update)
    try:
        yield
    finally:
        task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await task


async def send_reply(
    update: Update,
    text: str,
    context: ContextTypes.DEFAULT_TYPE | None = None,
) -> None:
    """Send a reply with Markdown v1, quoting the original message. Splits into chunks if text exceeds Telegram limit."""
    if not update.effective_message:
        return
    MAX_LEN = 4096
    # Detect raw JSON or non-Markdown responses (e.g. CLI error dumps)
    # and send as plain text to avoid Telegram Markdown parse errors.
    use_markdown = not (text.startswith("{") or text.startswith("["))
    if len(text) <= MAX_LEN:
        await update.effective_message.reply_text(
            text,
            parse_mode="Markdown" if use_markdown else None,
            do_quote=True,
        )
        return

    # Split intelligently on newlines, then spaces
    chunks: list[str] = []
    current = ""
    for line in text.split("\n"):
        if len(current) + len(line) + 1 <= MAX_LEN:
            current = f"{current}\n{line}" if current else line
        else:
            if current:
                chunks.append(current)
            current = line
            while len(current) > MAX_LEN:
                chunks.append(current[:MAX_LEN])
                current = current[MAX_LEN:]
    if current:
        chunks.append(current)

    for idx, chunk in enumerate(chunks):
        await update.effective_message.reply_text(
            chunk,
            parse_mode="Markdown" if use_markdown else None,
            do_quote=(idx == 0),
        )
        await asyncio.sleep(0.3)
