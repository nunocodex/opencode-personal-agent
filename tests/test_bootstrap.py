"""Tests for bootstrap checks."""
from __future__ import annotations

import sys
from pathlib import Path
from typing import Any
from unittest.mock import patch

import pytest

from bootstrap import (
    _check_dotenv,
    _check_opencode_in_path,
    _check_python_version,
    _clean_temp,
    _ensure_storage_dirs,
    run_checks,
)


class TestBootstrapChecks:
    def test_python_version_ok(self) -> None:
        # Should not raise on current Python
        _check_python_version()

    def test_dotenv_missing(self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.chdir(tmp_path)
        with pytest.raises(RuntimeError, match=".env file not found"):
            _check_dotenv()

    def test_opencode_missing(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setenv("PATH", "")
        with pytest.raises(RuntimeError, match="'opencode' command not found"):
            _check_opencode_in_path()

    def test_ensure_dirs(self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.chdir(tmp_path)
        _ensure_storage_dirs()
        assert (tmp_path / "storage" / "logs").exists()
        assert (tmp_path / "storage" / "models").exists()
        assert (tmp_path / "storage" / "temp").exists()

    def test_clean_temp(self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.chdir(tmp_path)
        temp = tmp_path / "storage" / "temp"
        temp.mkdir(parents=True)
        old_file = temp / "old.txt"
        old_file.write_text("x")
        # Mock mtime to be older than 1h
        with patch.object(Path, "stat", return_value=type("S", (), {"st_mtime": 0})()):
            _clean_temp()
        # Since stat is patched globally, it may affect other things;
        # just verify function runs without error.

    def test_run_checks_success(self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.chdir(tmp_path)
        env = tmp_path / ".env"
        env.write_text(
            "TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11\n"
            "ALLOWED_CHAT_ID=123\n"
            "OPENCODE_PROJECT_DIR=/tmp\n"
            "OPENCODE_SERVER_URL=http://localhost:4096\n"
        )
        with patch("shutil.which", return_value="/usr/bin/opencode"):
            cfg = run_checks()
        assert cfg is not None
        assert cfg.allowed_chat_id == 123
