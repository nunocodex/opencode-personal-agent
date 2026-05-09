"""Shared pytest fixtures."""
from __future__ import annotations

import os
import sys
from pathlib import Path
from typing import Any
from unittest.mock import AsyncMock, MagicMock

import pytest

# Ensure src is on path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from config import Config


@pytest.fixture
def config() -> Config:
    return Config(
        telegram_bot_token="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11",
        allowed_chat_id=123456789,
        opencode_project_dir=str(Path(__file__).parent.parent),
        opencode_server_url="http://127.0.0.1:4096",
        opencode_server_username="opencode",
        opencode_server_password="secret",
        whisper_language="auto",
    )


@pytest.fixture
def mock_update() -> MagicMock:
    update = MagicMock()
    update.effective_chat = MagicMock()
    update.effective_chat.id = 123456789
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


@pytest.fixture
def mock_context() -> MagicMock:
    ctx = MagicMock()
    ctx.bot = MagicMock()
    return ctx
