"""Additional tests for process manager edge cases."""
from __future__ import annotations

import asyncio
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from config import Config
from process.manager import ProcessManager


class TestProcessManagerEdgeCases:
    @pytest.fixture
    def pm(self, config: Config) -> ProcessManager:
        return ProcessManager(config)

    async def test_is_healthy_401_counts(self, pm: ProcessManager) -> None:
        with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = MagicMock(status_code=401)
            assert await pm.is_healthy() is False

    async def test_is_healthy_500_fails(self, pm: ProcessManager) -> None:
        with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = MagicMock(status_code=500)
            assert await pm.is_healthy() is False

    async def test_port_in_use_true(self, pm: ProcessManager) -> None:
        writer = MagicMock()
        writer.wait_closed = AsyncMock()
        mock_conn = AsyncMock(return_value=(MagicMock(), writer))
        with patch("asyncio.open_connection", mock_conn):
            result = await pm._is_port_in_use(4096, "127.0.0.1")
            assert result is True

    async def test_port_in_use_false(self, pm: ProcessManager) -> None:
        with patch("asyncio.open_connection", side_effect=OSError):
            result = await pm._is_port_in_use(4096, "127.0.0.1")
            assert result is False

    async def test_kill_port_processes_non_win(self, pm: ProcessManager) -> None:
        import process.manager as pm_module
        # On Windows signal.SIGKILL doesn't exist; add it temporarily
        had_sigkill = hasattr(pm_module.signal, "SIGKILL")
        if not had_sigkill:
            setattr(pm_module.signal, "SIGKILL", 9)
        try:
            with patch("sys.platform", "linux"):
                with patch("asyncio.create_subprocess_exec", new_callable=AsyncMock) as mock_proc:
                    proc = MagicMock()
                    proc.communicate = AsyncMock(return_value=(b"123\n456\n", b""))
                    mock_proc.return_value = proc
                    with patch("os.kill") as mock_kill:
                        await pm._kill_port_processes(4096)
                    assert mock_kill.call_count == 2
        finally:
            if not had_sigkill:
                delattr(pm_module.signal, "SIGKILL")

    async def test_kill_port_processes_windows(self, pm: ProcessManager) -> None:
        with patch("process.manager.ProcessManager._find_pids_on_port_windows", new_callable=AsyncMock) as mock_find:
            mock_find.return_value = [123, 456]
            with patch("os.kill") as mock_kill:
                await pm._kill_port_processes(4096)
            assert mock_kill.call_count == 2

    async def test_find_pids_on_port_windows_parses_output(self, pm: ProcessManager) -> None:
        fake_netstat = (
            "  TCP    0.0.0.0:4096   0.0.0.0:0    LISTENING       12345\r\n"
            "  TCP    0.0.0.0:0       0.0.0.0:0    LISTENING       0\r\n"
            "  TCP    0.0.0.0:8080   0.0.0.0:0    LISTENING       67890\r\n"
        )
        with patch("asyncio.create_subprocess_exec", new_callable=AsyncMock) as mock_proc:
            proc = MagicMock()
            proc.communicate = AsyncMock(return_value=(fake_netstat.encode(), b""))
            mock_proc.return_value = proc
            pids = await pm._find_pids_on_port_windows(4096)
        assert pids == [12345]

    async def test_find_pids_excludes_pid_zero(self, pm: ProcessManager) -> None:
        fake_netstat = "  TCP    0.0.0.0:4096   0.0.0.0:0    LISTENING       0\r\n"
        with patch("asyncio.create_subprocess_exec", new_callable=AsyncMock) as mock_proc:
            proc = MagicMock()
            proc.communicate = AsyncMock(return_value=(fake_netstat.encode(), b""))
            mock_proc.return_value = proc
            pids = await pm._find_pids_on_port_windows(4096)
        assert pids == []

    async def test_find_pids_returns_empty_on_error(self, pm: ProcessManager) -> None:
        with patch("asyncio.create_subprocess_exec", side_effect=FileNotFoundError):
            pids = await pm._find_pids_on_port_windows(4096)
        assert pids == []

    async def test_pipe_stdout(self, pm: ProcessManager) -> None:
        pm._process = MagicMock()
        pm._process.stdout = MagicMock()
        pm._process.stdout.readline = AsyncMock(side_effect=[b"line1\n", b"line2\n", b""])
        with patch("builtins.print") as mock_print:
            await pm._pipe_stdout()
        assert mock_print.call_count == 2

    async def test_pipe_stderr(self, pm: ProcessManager) -> None:
        pm._process = MagicMock()
        pm._process.stderr = MagicMock()
        pm._process.stderr.readline = AsyncMock(side_effect=[b"err1\n", b""])
        with patch("builtins.print") as mock_print:
            await pm._pipe_stderr()
        assert mock_print.call_count == 1
