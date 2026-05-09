"""Configuration loaded from environment variables."""
from __future__ import annotations

import os
import re
import sys
from dataclasses import dataclass


def _env(key: str, default: str | None = None) -> str:
    val = os.getenv(key, default)
    if val is None:
        raise ValueError(f"Missing required environment variable: {key}")
    return val


def _env_int(key: str, default: int | None = None) -> int:
    raw = os.getenv(key)
    if raw is None:
        if default is None:
            raise ValueError(f"Missing required environment variable: {key}")
        return default
    try:
        return int(raw)
    except ValueError as exc:
        raise ValueError(f"Invalid integer for {key}: {raw}") from exc


@dataclass(frozen=True, slots=True)
class Config:
    telegram_bot_token: str
    allowed_chat_id: int
    opencode_project_dir: str
    opencode_server_url: str
    opencode_server_username: str
    opencode_server_password: str | None
    whisper_language: str

    @classmethod
    def from_env(cls) -> "Config":
        token = _env("TELEGRAM_BOT_TOKEN")
        if not re.fullmatch(r"\d+:[A-Za-z0-9_-]+", token):
            raise ValueError(
                "TELEGRAM_BOT_TOKEN format invalid (expected digits:alphanumerics)"
            )

        allowed_chat_id = _env_int("ALLOWED_CHAT_ID")
        project_dir = _env("OPENCODE_PROJECT_DIR")
        server_url = _env("OPENCODE_SERVER_URL")
        username = os.getenv("OPENCODE_SERVER_USERNAME", "opencode")
        password = os.getenv("OPENCODE_SERVER_PASSWORD") or None
        whisper_language = os.getenv("WHISPER_LANGUAGE", "auto")

        return cls(
            telegram_bot_token=token,
            allowed_chat_id=allowed_chat_id,
            opencode_project_dir=project_dir,
            opencode_server_url=server_url,
            opencode_server_username=username,
            opencode_server_password=password,
            whisper_language=whisper_language,
        )


def load_config() -> Config:
    dotenv_path = os.path.join(os.getcwd(), ".env")
    if os.path.exists(dotenv_path):
        try:
            from dotenv import load_dotenv
            load_dotenv(dotenv_path, override=True)
        except ImportError:
            pass
    return Config.from_env()
