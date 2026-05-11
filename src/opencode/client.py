"""HTTP client for OpenCode server API and CLI subprocess communication."""
from __future__ import annotations

import asyncio
import base64
import json
import os
import shutil
from pathlib import Path
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
        self._project_dir = config.opencode_project_dir
        # Reusable HTTP client connection pool
        self._client: httpx.AsyncClient | None = None

    def _get_client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(timeout=httpx.Timeout(30.0, connect=10.0))
        return self._client

    async def close(self) -> None:
        if self._client is not None:
            await self._client.aclose()
            self._client = None

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
        client = self._get_client()
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
        client = self._get_client()
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

    async def send_message_cli(
        self,
        text: str,
        *,
        timeout: int = 300,
    ) -> str:
        """Send a message via `opencode run` CLI to get full agent context (tools, subagents).

        Unlike send_message() (REST API), this spawns the opencode CLI which
        gives the session access to the full system prompt including subagent
        definitions and the task() tool — same as the interactive opencode chat.

        Each call creates a disposable session — no session_id needed since
        REST API sessions are not accessible from the CLI.
        """
        exe = shutil.which("opencode") or shutil.which("opencode.cmd")
        if not exe:
            raise RuntimeError("'opencode' executable not found in PATH")

        # Compress newlines only if message is passed as CLI argument.
        # Windows CLI may truncate multi-line args, so we pass via stdin
        # to preserve the full message structure.
        cmd = [
            exe, "run", "--format", "json",
            "--title", "Bot file analysis",
            "--dir", str(Path(self._project_dir).resolve()),
            "-",  # Read message from stdin
        ]

        print("[opencode] spawning CLI subprocess")

        # Strip auth env vars — opencode run CLI creates local sessions and
        # gets confused by OPENCODE_SERVER_USERNAME/PASSWORD from the .env.
        # Also strip Telegram/HF tokens to avoid leaking to subprocesses.
        strip_vars = {
            "OPENCODE_SERVER_USERNAME", "OPENCODE_SERVER_PASSWORD",
            "OPENCODE_SERVER_URL", "TELEGRAM_BOT_TOKEN", "HF_TOKEN",
        }
        clean_env = {k: v for k, v in os.environ.items()
                     if k not in strip_vars}

        proc = await asyncio.create_subprocess_exec(
            *cmd,
            env=clean_env,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        try:
            stdout, stderr = await asyncio.wait_for(
                proc.communicate(text.encode()), timeout=timeout,
            )
        except asyncio.TimeoutError:
            proc.kill()
            await proc.wait()
            print(f"[opencode] CLI timed out after {timeout}s")
            return "(timeout)"
        except Exception:
            proc.kill()
            await proc.wait()
            raise

        out_text = stdout.decode(errors="replace").strip()
        err_text = stderr.decode(errors="replace").strip()

        print(f"[opencode] CLI exit code: {proc.returncode}")
        if err_text:
            print(f"[opencode] CLI stderr: {err_text[:1000]}")
        if out_text:
            print(f"[opencode] CLI stdout ({len(out_text)} chars): {out_text[:500]}")

        # Parse JSON stream — each line is a JSON event
        response = self._parse_json_stream(out_text) if out_text else ""

        if not response:
            if out_text:
                print(f"[opencode] no JSON parsed; raw stdout ({len(out_text)} chars): {out_text[:500]}")
                return out_text
            print("[opencode] empty CLI response")
            return "(no response)"

        print(f"[opencode] CLI response ({len(response)} chars): {response[:200]}")
        return response

    def _parse_json_stream(self, text: str) -> str:
        """Parse opencode JSON stream output and extract text responses."""
        response_text = ""
        for line in text.split("\n"):
            line = line.strip()
            if not line or not line.startswith("{"):
                continue
            try:
                obj = json.loads(line)
            except json.JSONDecodeError:
                continue

            if obj.get("type") == "text":
                part = obj.get("part")
                if isinstance(part, dict):
                    content = part.get("text") or part.get("content") or ""
                    if isinstance(content, str) and content.strip():
                        response_text += content
                else:
                    content = obj.get("text") or obj.get("content") or ""
                    if isinstance(content, str) and content.strip():
                        response_text += content
        return response_text.strip()

    async def delete_session(self, session_id: str) -> None:
        url = f"{self.base_url}/session/{session_id}"
        client = self._get_client()
        resp = await client.delete(url, headers=self._headers(), timeout=30.0)
        if resp.status_code == 404:
            return
        resp.raise_for_status()
