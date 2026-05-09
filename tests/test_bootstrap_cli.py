"""Tests for bootstrap checks and CLI."""
from __future__ import annotations

import os
import sys
from pathlib import Path
from typing import Any
from unittest.mock import patch

import pytest

from cli import main


class TestBootstrapChecks:
    def test_check_fails_without_env(self, monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
        monkeypatch.chdir(tmp_path)
        monkeypatch.delenv("TELEGRAM_BOT_TOKEN", raising=False)
        with patch.object(sys, "argv", ["cli", "check"]):
            rc = main()
        assert rc != 0

    def test_setup_creates_env(self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.chdir(tmp_path)
        example = tmp_path / ".env.example"
        example.write_text("FOO=bar\n")
        with patch.object(sys, "argv", ["cli", "setup"]):
            rc = main()
        assert rc == 0
        assert (tmp_path / ".env").exists()

    def test_setup_idempotent(self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.chdir(tmp_path)
        (tmp_path / ".env").write_text("existing=1\n")
        with patch.object(sys, "argv", ["cli", "setup"]):
            rc = main()
        assert rc == 0
        assert (tmp_path / ".env").read_text() == "existing=1\n"


class TestCLI:
    def test_check_help(self, capsys: Any) -> None:
        with patch.object(sys, "argv", ["cli", "--help"]):
            with pytest.raises(SystemExit):
                main()
        captured = capsys.readouterr()
        assert "check" in captured.out

    def test_unknown_command(self) -> None:
        with patch.object(sys, "argv", ["cli", "nope"]):
            with pytest.raises(SystemExit):
                main()
