---
name: testing-patterns
description: pytest conventions and mocking patterns for this project. Load when writing or updating tests.
---

# Testing

Command: `pytest tests/ --cov=src -v`. Coverage minimum: 84%.

## Isolation (mandatory)
No real network. No real filesystem outside `tmp_path`. No real subprocess. No real model downloads.

## Mocks
- Telegram Update → fixture in `tests/conftest.py`
- HTTP client → `httpx.MockTransport` or project fixture
- Subprocess → patch `asyncio.create_subprocess_exec` with `AsyncMock`
- Voice → patch `WhisperModel`, never instantiate

## Naming
- Files: `test_<module>_<scenario>.py`
- Functions: `test_<scenario>_<expected>()`
- Async: `@pytest.mark.asyncio`

Report coverage diff before → after. If it drops, flag and don't close.

Reply in Italian.