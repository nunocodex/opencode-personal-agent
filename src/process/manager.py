"""Process manager for opencode serve lifecycle."""
from __future__ import annotations

import asyncio
import contextlib
import os
import shutil
import signal
import subprocess
import sys
import time
from pathlib import Path
from typing import Any

import httpx

from config import Config


class ProcessManager:
    def __init__(self, config: Config) -> None:
        self.config = config
        self._process: asyncio.subprocess.Process | None = None
        self._start_time: float | None = None
        self._pipe_tasks: list[asyncio.Task[None]] = []
        self._health_client: httpx.AsyncClient | None = None

    async def start(self) -> None:
        if self._process is not None and self._process.returncode is None:
            healthy = await self.is_healthy()
            if healthy:
                print("[ProcessManager] already running and healthy")
                return
            await self.stop()

        parsed = httpx.URL(self.config.opencode_server_url)
        host = parsed.host or "127.0.0.1"
        port = parsed.port or 4096

        # Check port
        port_occupied = await self._is_port_in_use(port, host)
        if port_occupied:
            print(f"[ProcessManager] port {port} occupied, attempting cleanup...")
            await self._kill_port_processes(port)
            await asyncio.sleep(2)

        print("[ProcessManager] starting opencode serve...")
        exe = shutil.which("opencode") or shutil.which("opencode.cmd")
        if not exe:
            raise RuntimeError("'opencode' executable not found in PATH")
        cmd = [exe, "serve", "--port", str(port), "--hostname", host]

        # Strip sensitive env vars — opencode serve does not need Telegram,
        # HF, or OpenCode server credentials. Prevents credential leakage
        # if the subprocess is compromised or logs its environment.
        strip_vars = {
            "OPENCODE_SERVER_USERNAME", "OPENCODE_SERVER_PASSWORD",
            "OPENCODE_SERVER_URL", "TELEGRAM_BOT_TOKEN", "HF_TOKEN",
        }
        clean_env = {k: v for k, v in os.environ.items()
                     if k not in strip_vars}

        if sys.platform == "win32":
            # On Windows use CREATE_NEW_PROCESS_GROUP for graceful SIGTERM
            self._process = await asyncio.create_subprocess_exec(
                *cmd,
                cwd=self.config.opencode_project_dir,
                env=clean_env,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                creationflags=subprocess.CREATE_NEW_PROCESS_GROUP,  # type: ignore[attr-defined]
            )
        else:
            self._process = await asyncio.create_subprocess_exec(
                *cmd,
                cwd=self.config.opencode_project_dir,
                env=clean_env,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )

        self._start_time = time.monotonic()

        # Pipe loggers
        self._pipe_tasks = [
            asyncio.create_task(self._pipe_stdout()),
            asyncio.create_task(self._pipe_stderr()),
        ]

        await asyncio.sleep(5)
        healthy = await self.is_healthy()
        if not healthy:
            # Close health client on failure to avoid leak
            await self.close()
            raise RuntimeError("opencode serve is not responding after 5s")
        print(f"[ProcessManager] ready at {self.config.opencode_server_url}")

    async def stop(self) -> None:
        print("[ProcessManager] stopping...")
        if self._process is None or self._process.returncode is not None:
            self._process = None
            self._start_time = None
            # Still clean up port in case orphans survive
            parsed = httpx.URL(self.config.opencode_server_url)
            port = parsed.port or 4096
            await self._kill_port_processes(port)
            return

        try:
            if sys.platform == "win32":
                self._process.kill()
            else:
                self._process.send_signal(signal.SIGTERM)
        except ProcessLookupError:
            pass

        try:
            await asyncio.wait_for(self._process.wait(), timeout=5.0)
        except asyncio.TimeoutError:
            if sys.platform != "win32":
                print("[ProcessManager] SIGTERM timeout, escalating to SIGKILL")
                try:
                    self._process.kill()
                    await asyncio.wait_for(self._process.wait(), timeout=2.0)
                except (ProcessLookupError, asyncio.TimeoutError):
                    pass

        # Close subprocess streams to release pipe transports before
        # the event loop shuts down, preventing "I/O on closed pipe" warnings
        for stream_name in ("stdout", "stderr"):
            stream = getattr(self._process, stream_name, None)
            if stream is not None:
                try:
                    stream._transport.close()
                except Exception:
                    pass

        self._process = None
        self._start_time = None

        # Wait for pipe reader tasks to exit naturally (they get EOF
        # because the subprocess pipes are closed after killing the process)
        if self._pipe_tasks:
            _, pending = await asyncio.wait(
                self._pipe_tasks, timeout=2.0,
            )
            # Cancel any that didn't finish (shouldn't happen after kill)
            for t in pending:
                t.cancel()
                with contextlib.suppress(asyncio.CancelledError):
                    await t
        self._pipe_tasks = []
        # Kill any remaining processes holding the port (orphaned children)
        parsed = httpx.URL(self.config.opencode_server_url)
        port = parsed.port or 4096
        await self._kill_port_processes(port)
        print("[ProcessManager] stopped.")

    async def restart(self) -> None:
        await self.stop()
        await self.start()

    async def is_healthy(self) -> bool:
        try:
            if self._health_client is None:
                self._health_client = httpx.AsyncClient()
            resp = await self._health_client.get(
                f"{self.config.opencode_server_url}/global/health",
                timeout=5.0,
            )
            return 200 <= resp.status_code < 300
        except Exception:
            return False

    async def close(self) -> None:
        if self._health_client is not None:
            await self._health_client.aclose()
            self._health_client = None

    def uptime_seconds(self) -> float | None:
        if self._start_time is None:
            return None
        return time.monotonic() - self._start_time

    async def _is_port_in_use(self, port: int, host: str) -> bool:
        try:
            reader, writer = await asyncio.wait_for(
                asyncio.open_connection(host, port), timeout=2.0
            )
            writer.close()
            await writer.wait_closed()
            return True
        except Exception:
            return False

    async def _kill_port_processes(self, port: int) -> None:
        if sys.platform == "win32":
            pids = await self._find_pids_on_port_windows(port)
            for pid in pids:
                try:
                    os.kill(pid, signal.SIGTERM)
                    print(f"[ProcessManager] killed PID {pid} on port {port}")
                except (ProcessLookupError, PermissionError):
                    pass
        else:
            try:
                proc = await asyncio.create_subprocess_exec(
                    "lsof", "-t", f"-i:{port}",
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                )
                stdout, _ = await proc.communicate()
                for pid_str in stdout.decode().strip().split():
                    try:
                        os.kill(int(pid_str), signal.SIGKILL)
                    except (ValueError, ProcessLookupError):
                        pass
            except FileNotFoundError:
                pass

    @staticmethod
    async def _find_pids_on_port_windows(port: int) -> list[int]:
        try:
            proc = await asyncio.create_subprocess_exec(
                "netstat.exe", "-ano",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.DEVNULL,
            )
            stdout, _ = await proc.communicate()
            pids: list[int] = []
            for line in stdout.decode(errors="replace").splitlines():
                parts = line.strip().split()
                if len(parts) >= 5 and f":{port}" in parts[1]:
                    try:
                        pid = int(parts[4])
                        if pid != 0 and pid not in pids:
                            pids.append(pid)
                    except (ValueError, IndexError):
                        pass
            return pids
        except (FileNotFoundError, OSError):
            return []

    async def _pipe_stdout(self) -> None:
        if self._process is None or self._process.stdout is None:
            return
        while True:
            line = await self._process.stdout.readline()
            if not line:
                break
            text = line.decode(errors="replace").strip()
            if text:
                print(f"[opencode-serve] {text}")

    async def _pipe_stderr(self) -> None:
        if self._process is None or self._process.stderr is None:
            return
        while True:
            line = await self._process.stderr.readline()
            if not line:
                break
            text = line.decode(errors="replace").strip()
            if text:
                print(f"[opencode-serve] {text}", file=sys.stderr)
