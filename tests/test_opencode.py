"""Tests for OpenCode HTTP client."""
from __future__ import annotations

import httpx
import pytest
import respx
from respx import MockRouter
from unittest.mock import AsyncMock, patch

from config import Config
from opencode.client import OpenCodeClient


class TestCreateSession:
    @respx.mock
    async def test_create_session_success(self, config: Config) -> None:
        route = respx.post("http://127.0.0.1:4096/session").mock(
            return_value=httpx.Response(200, json={"id": "sess-123"})
        )
        client = OpenCodeClient(config)
        sid = await client.create_session("Test", "/proj")
        assert sid == "sess-123"
        assert route.called
        req = route.calls[0].request
        assert "directory=%2Fproj" in str(req.url)

    @respx.mock
    async def test_create_session_missing_id(self, config: Config) -> None:
        respx.post("http://127.0.0.1:4096/session").mock(
            return_value=httpx.Response(200, json={})
        )
        client = OpenCodeClient(config)
        with pytest.raises(ValueError, match="missing id"):
            await client.create_session("Test")


class TestSendMessage:
    @respx.mock
    async def test_send_message_extracts_text(self, config: Config) -> None:
        respx.post("http://127.0.0.1:4096/session/sess-123/message").mock(
            return_value=httpx.Response(
                200,
                json={"parts": [{"type": "text", "text": "Hello world"}]},
            )
        )
        client = OpenCodeClient(config)
        text = await client.send_message("sess-123", "hi")
        assert text == "Hello world"

    @respx.mock
    async def test_send_message_no_response(self, config: Config) -> None:
        respx.post("http://127.0.0.1:4096/session/sess-123/message").mock(
            return_value=httpx.Response(200, json={"parts": []})
        )
        client = OpenCodeClient(config)
        text = await client.send_message("sess-123", "hi")
        assert text == "(no response)"


class TestDeleteSession:
    @respx.mock
    async def test_delete_session_success(self, config: Config) -> None:
        route = respx.delete("http://127.0.0.1:4096/session/sess-123").mock(
            return_value=httpx.Response(204)
        )
        client = OpenCodeClient(config)
        await client.delete_session("sess-123")
        assert route.called

    @respx.mock
    async def test_delete_session_404_ignored(self, config: Config) -> None:
        respx.delete("http://127.0.0.1:4096/session/sess-123").mock(
            return_value=httpx.Response(404)
        )
        client = OpenCodeClient(config)
        await client.delete_session("sess-123")


class TestSendMessageCLI:
    @staticmethod
    def _mock_exec() -> AsyncMock:
        mock_proc = AsyncMock()
        mock_proc.communicate = AsyncMock(return_value=(b'{"type":"text","text":"ok"}', b""))
        mock_proc.returncode = 0
        return mock_proc

    async def test_cli_includes_agent_flag(self, config: Config) -> None:
        client = OpenCodeClient(config)
        with patch("opencode.client.asyncio.create_subprocess_exec", new_callable=AsyncMock) as mock_exec:
            mock_exec.return_value = self._mock_exec()
            with patch("opencode.client.shutil.which", return_value="/usr/bin/opencode"):
                await client.send_message_cli("analyze this image")
        cmd_args = mock_exec.call_args[0]
        assert "--agent" in cmd_args
        agent_idx = cmd_args.index("--agent")
        assert cmd_args[agent_idx + 1] == "file-parser"

    async def test_cli_includes_file_flag(self, config: Config) -> None:
        client = OpenCodeClient(config)
        with patch("opencode.client.asyncio.create_subprocess_exec", new_callable=AsyncMock) as mock_exec:
            mock_exec.return_value = self._mock_exec()
            with patch("opencode.client.shutil.which", return_value="/usr/bin/opencode"):
                await client.send_message_cli("analyze this", file_paths=["/path/to/img.jpg"])
        cmd_args = mock_exec.call_args[0]
        assert "--file" in cmd_args
        file_idx = cmd_args.index("--file")
        assert cmd_args[file_idx + 1] == "/path/to/img.jpg"

    async def test_cli_omits_file_flag_when_not_provided(self, config: Config) -> None:
        client = OpenCodeClient(config)
        with patch("opencode.client.asyncio.create_subprocess_exec", new_callable=AsyncMock) as mock_exec:
            mock_exec.return_value = self._mock_exec()
            with patch("opencode.client.shutil.which", return_value="/usr/bin/opencode"):
                await client.send_message_cli("just text")
        cmd_args = mock_exec.call_args[0]
        assert "--file" not in cmd_args
