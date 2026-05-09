"""In-memory session store: chat_id -> session_id."""
from __future__ import annotations


class SessionStore:
    def __init__(self) -> None:
        self._store: dict[int, str] = {}

    def get(self, chat_id: int) -> str | None:
        return self._store.get(chat_id)

    def set(self, chat_id: int, session_id: str) -> None:
        self._store[chat_id] = session_id

    def delete(self, chat_id: int) -> None:
        self._store.pop(chat_id, None)

    def clear(self) -> None:
        self._store.clear()
