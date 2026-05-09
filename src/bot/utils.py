"""Bot reply utilities."""
from __future__ import annotations

import asyncio
from typing import Any

from telegram import Update
from telegram.ext import ContextTypes


async def send_reply(
    update: Update,
    text: str,
    reply_to_message_id: int | None = None,
    context: ContextTypes.DEFAULT_TYPE | None = None,
) -> None:
    """Send a reply, splitting into chunks if text exceeds Telegram limit."""
    if not update.effective_message:
        return
    MAX_LEN = 4096
    if len(text) <= MAX_LEN:
        await update.effective_message.reply_text(
            text,
            reply_to_message_id=reply_to_message_id,
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
            reply_to_message_id=reply_to_message_id if idx == 0 else None,
        )
        await asyncio.sleep(0.3)
