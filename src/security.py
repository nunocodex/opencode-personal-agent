"""Security utilities: path traversal prevention and sensitive file guards."""
from __future__ import annotations

import os
import re
from pathlib import Path

SENSITIVE_PATTERNS = frozenset(
    {
        ".env",
        ".env.local",
        ".env.production",
        ".envrc",
        ".ssh",
        "id_rsa",
        "id_ed25519",
        "id_ecdsa",
        "id_dsa",
        "known_hosts",
        "authorized_keys",
        ".aws",
        ".docker",
        "credentials",
        "secrets",
        "secret",
        "private.key",
        "private.pem",
        "*.key",
        "*.pem",
        "*.p12",
        "*.pfx",
        ".htpasswd",
        ".netrc",
        "token",
        "tokens",
    }
)


def _normalize(name: str) -> str:
    return name.lower().replace("\\", "/")


def is_sensitive(filename: str) -> bool:
    """Return True if filename matches a sensitive file pattern."""
    norm = _normalize(filename)
    base = os.path.basename(norm)
    for pattern in SENSITIVE_PATTERNS:
        if pattern.startswith("*"):
            if base.endswith(pattern[1:]):
                return True
        elif base == pattern or norm.endswith(f"/{pattern}"):
            return True
    return False


def safe_path(filename: str, base_dir: str | Path) -> Path:
    """Resolve a filename inside base_dir, raising ValueError on traversal attempts."""
    base = Path(base_dir).resolve()
    target = (base / filename).resolve()
    # Ensure target is within base
    try:
        target.relative_to(base)
    except ValueError as exc:
        raise ValueError(f"Path traversal blocked: {filename}") from exc
    if is_sensitive(filename):
        raise ValueError(f"Sensitive file blocked: {filename}")
    return target
