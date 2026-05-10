"""Process manager for opencode serve lifecycle."""
from __future__ import annotations

import asyncio
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
        if sys.platform == "win32":
            # On Windows use CREATE_NEW_PROCESS_GROUP for graceful SIGTERM
            self._process = await asyncio.create_subprocess_exec(
                *cmd,
                cwd=self.config.opencode_project_dir,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                creationflags=subprocess.CREATE_NEW_PROCESS_GROUP,  # type: ignore[attr-defined]
            )
        else:
            self._process = await asyncio.create_subprocess_exec(
                *cmd,
                cwd=self.config.opencode_project_dir,
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
            raise RuntimeError("opencode serve is not responding after 5s")
        print(f"[ProcessManager] ready at {self.config.opencode_server_url}")

    async def stop(self) -> None:
        print("[ProcessManager] stopping...")
        if self._process is None or self._process.returncode is not None:
            self._process = None
            self._start_time = None
            return

        try:
            if sys.platform == "win32":
                self._process.terminate()
            else:
                self._process.send_signal(signal.SIGTERM)
        except ProcessLookupError:
            pass

        try:
            await asyncio.wait_for(self._process.wait(), timeout=5.0)
        except asyncio.TimeoutError:
            print("[ProcessManager] terminate/SIGTERM timeout, escalating to SIGKILL")
            try:
                self._process.kill()
                await asyncio.wait_for(self._process.wait(), timeout=2.0)
            except (ProcessLookupError, asyncio.TimeoutError):
                pass

        self._process = None
        self._start_time = None

        # Cancel pipe reader tasks
        for task in self._pipe_tasks:
            task.cancel()
        self._pipe_tasks = []
        print("[ProcessManager] stopped.")

    async def restart(self) -> None:
        await self.stop()
        await self.start()

    async def is_healthy(self) -> bool:
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    f"{self.config.opencode_server_url}/global/health",
                    timeout=5.0,
                )
            return resp.status_code < 500
        except Exception:
            return False

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
            # Best-effort via netstat / taskkill omitted for simplicity;
            # rely on subsequent start failure if port remains occupied.
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

    async def _pipe_stdout(self) -> None:
        if self._process is None or self._process.stdout is None:
            return
        while True:
            line = await self._process.stdout.readline()
            if not line:
                break
            text = line.decode().strip()
            if text:
                print(f"[opencode-serve] {text}")

    async def _pipe_stderr(self) -> None:
        if self._process is None or self._process.stderr is None:
            return
        while True:
            line = await self._process.stderr.readline()
            if not line:
                break
            text = line.decode().strip()
            if text:
                print(f"[opencode-serve] {text}", file=sys.stderr)
