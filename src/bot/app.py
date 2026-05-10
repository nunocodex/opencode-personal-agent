"""PTB Application setup with per-handler auth and graceful shutdown."""
from __future__ import annotations

import sys
from pathlib import Path

from telegram.ext import (
    Application,
    CommandHandler,
    MessageHandler,
    filters,
)

# Ensure src/ is on path when run directly
_SRC = str(Path(__file__).parent.parent)
if _SRC not in sys.path:
    sys.path.insert(0, _SRC)

from config import Config
from process.manager import ProcessManager

from bot.handlers import BotHandlers
from bot.session import SessionStore


def build_app(config: Config, process_manager: ProcessManager) -> Application:
    store = SessionStore()
    handlers = BotHandlers(config, store, process_manager)

    app = (
        Application.builder()
        .token(config.telegram_bot_token)
        .build()
    )

    # Commands
    app.add_handler(CommandHandler("start", handlers.cmd_start))
    app.add_handler(CommandHandler("help", handlers.cmd_help))
    app.add_handler(CommandHandler("new", handlers.cmd_new))
    app.add_handler(CommandHandler("status", handlers.cmd_status))
    app.add_handler(CommandHandler("restart", handlers.cmd_restart))

    # Messages
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handlers.on_text))
    app.add_handler(MessageHandler(filters.PHOTO, handlers.on_photo))
    app.add_handler(MessageHandler(filters.Document.ALL, handlers.on_document))
    app.add_handler(MessageHandler(filters.VOICE, handlers.on_voice))

    return app
