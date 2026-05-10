"""HTTP client for OpenCode server API."""
from __future__ import annotations

import base64
import os
from typing import Any

import httpx

from config import Config


class OpenCodeClient:
    def __init__(self, config: Config) -> None:
        self.base_url = config.opencode_server_url.rstrip("/")
        self._auth: str | None = None
        if config.opencode_server_password:
            creds = f"{config.opencode_server_username}:{config.opencode_server_password}"
            self._auth = base64.b64encode(creds.encode()).decode()

    def _headers(self) -> dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if self._auth:
            headers["Authorization"] = f"Basic {self._auth}"
        return headers

    async def create_session(self, title: str, project_dir: str | None = None) -> str:
        url = f"{self.base_url}/session"
        params: dict[str, str] = {}
        if project_dir:
            params["directory"] = project_dir
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                url,
                params=params,
                headers=self._headers(),
                json={"title": title},
                timeout=30.0,
            )
        resp.raise_for_status()
        data = resp.json()
        session_id = data.get("id")
        if not session_id:
            raise ValueError("Created session response missing id")
        return str(session_id)

    async def send_message(self, session_id: str, text: str) -> str:
        text_preview = text[:200]
        url = f"{self.base_url}/session/{session_id}/message"
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                url,
                headers=self._headers(),
                json={"parts": [{"type": "text", "text": text}]},
                timeout=300.0,
            )
        if resp.status_code != 200:
            print(f"[opencode] send_message returned {resp.status_code}: {resp.text[:500]}")
            resp.raise_for_status()
        data = resp.json()
        parts_resp = data.get("parts", [])
        response_text = ""
        for part in parts_resp:
            if isinstance(part, dict) and part.get("type") == "text" and isinstance(part.get("text"), str):
                response_text += part["text"]
        if not response_text:
            print(f"[opencode] send_message: empty response for {text_preview}...")
        return response_text or "(no response)"

    async def delete_session(self, session_id: str) -> None:
        url = f"{self.base_url}/session/{session_id}"
        async with httpx.AsyncClient() as client:
            resp = await client.delete(url, headers=self._headers(), timeout=30.0)
        if resp.status_code == 404:
            return
        resp.raise_for_status()
