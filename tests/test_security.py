"""Tests for security utilities."""
from __future__ import annotations

from pathlib import Path

import pytest

from security import is_sensitive, safe_path


class TestIsSensitive:
    def test_env_file(self) -> None:
        assert is_sensitive(".env")
        assert is_sensitive("config/.env")
        assert is_sensitive(".env.local")

    def test_ssh_keys(self) -> None:
        assert is_sensitive("id_rsa")
        assert is_sensitive("~/.ssh/id_ed25519")
        assert is_sensitive("authorized_keys")

    def test_pem_keys(self) -> None:
        assert is_sensitive("server.pem")
        assert is_sensitive("key.pem")

    def test_normal_file(self) -> None:
        assert not is_sensitive("photo.jpg")
        assert not is_sensitive("document.pdf")
        assert not is_sensitive("voice.ogg")


class TestSafePath:
    def test_valid_path(self, tmp_path: Path) -> None:
        base = tmp_path / "storage" / "temp"
        base.mkdir(parents=True)
        result = safe_path("photo.jpg", base)
        assert result == base / "photo.jpg"

    def test_traversal_blocked(self, tmp_path: Path) -> None:
        base = tmp_path / "storage" / "temp"
        base.mkdir(parents=True)
        with pytest.raises(ValueError, match="Path traversal blocked"):
            safe_path("../../etc/passwd", base)

    def test_sensitive_blocked(self, tmp_path: Path) -> None:
        base = tmp_path / "storage" / "temp"
        base.mkdir(parents=True)
        with pytest.raises(ValueError, match="Sensitive file blocked"):
            safe_path(".env", base)
