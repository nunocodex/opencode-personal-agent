"""Tests for configuration loading and validation."""
from __future__ import annotations

import os
from pathlib import Path

import pytest

from config import Config, load_config


class TestConfigValidation:
    def test_valid_token(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setenv("TELEGRAM_BOT_TOKEN", "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11")
        monkeypatch.setenv("ALLOWED_CHAT_ID", "123")
        monkeypatch.setenv("OPENCODE_PROJECT_DIR", "/tmp")
        monkeypatch.setenv("OPENCODE_SERVER_URL", "http://localhost:4096")
        cfg = Config.from_env()
        assert cfg.telegram_bot_token == "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
        assert cfg.allowed_chat_id == 123

    def test_invalid_token_format(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setenv("TELEGRAM_BOT_TOKEN", "bad-token")
        monkeypatch.setenv("ALLOWED_CHAT_ID", "123")
        monkeypatch.setenv("OPENCODE_PROJECT_DIR", "/tmp")
        monkeypatch.setenv("OPENCODE_SERVER_URL", "http://localhost:4096")
        with pytest.raises(ValueError, match="format invalid"):
            Config.from_env()

    def test_missing_required(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.delenv("TELEGRAM_BOT_TOKEN", raising=False)
        monkeypatch.setenv("ALLOWED_CHAT_ID", "123")
        monkeypatch.setenv("OPENCODE_PROJECT_DIR", "/tmp")
        monkeypatch.setenv("OPENCODE_SERVER_URL", "http://localhost:4096")
        with pytest.raises(ValueError, match="Missing required"):
            Config.from_env()

    def test_invalid_int(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setenv("TELEGRAM_BOT_TOKEN", "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11")
        monkeypatch.setenv("ALLOWED_CHAT_ID", "abc")
        monkeypatch.setenv("OPENCODE_PROJECT_DIR", "/tmp")
        monkeypatch.setenv("OPENCODE_SERVER_URL", "http://localhost:4096")
        with pytest.raises(ValueError, match="Invalid integer"):
            Config.from_env()

    def test_defaults(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setenv("TELEGRAM_BOT_TOKEN", "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11")
        monkeypatch.setenv("ALLOWED_CHAT_ID", "123")
        monkeypatch.setenv("OPENCODE_PROJECT_DIR", "/tmp")
        monkeypatch.setenv("OPENCODE_SERVER_URL", "http://localhost:4096")
        monkeypatch.delenv("OPENCODE_SERVER_USERNAME", raising=False)
        monkeypatch.delenv("OPENCODE_SERVER_PASSWORD", raising=False)
        monkeypatch.delenv("WHISPER_LANGUAGE", raising=False)
        cfg = Config.from_env()
        assert cfg.opencode_server_username == "opencode"
        assert cfg.opencode_server_password is None
        assert cfg.whisper_language == "auto"

    def test_load_config_reads_dotenv(self, monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
        env_file = tmp_path / ".env"
        env_file.write_text(
            "TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11\n"
            "ALLOWED_CHAT_ID=999\n"
            "OPENCODE_PROJECT_DIR=/tmp\n"
            "OPENCODE_SERVER_URL=http://localhost:4096\n"
        )
        monkeypatch.chdir(tmp_path)
        monkeypatch.delenv("TELEGRAM_BOT_TOKEN", raising=False)
        monkeypatch.delenv("ALLOWED_CHAT_ID", raising=False)
        cfg = load_config()
        assert cfg.allowed_chat_id == 999
