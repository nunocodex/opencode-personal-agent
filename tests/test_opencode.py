"""Tests for OpenCode HTTP client."""
from __future__ import annotations

import httpx
import pytest
import respx
from respx import MockRouter

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
