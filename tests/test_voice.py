"""Tests for voice transcription."""
from __future__ import annotations

from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from voice.transcriber import VoiceTranscriber


class TestVoiceTranscriber:
    def test_transcribe_mocked(self) -> None:
        transcriber = VoiceTranscriber()
        fake_segment = MagicMock()
        fake_segment.text = "hello world"
        fake_model = MagicMock()
        fake_model.transcribe.return_value = ([fake_segment], MagicMock())

        with patch.object(transcriber, "_init_model", return_value=fake_model):
            text = transcriber.transcribe("fake.ogg", language="en")
        assert text == "hello world"
        fake_model.transcribe.assert_called_once()
        args, kwargs = fake_model.transcribe.call_args
        assert kwargs.get("language") == "en"

    def test_transcribe_auto_language(self) -> None:
        transcriber = VoiceTranscriber()
        fake_segment = MagicMock()
        fake_segment.text = "ciao mondo"
        fake_model = MagicMock()
        fake_model.transcribe.return_value = ([fake_segment], MagicMock())

        with patch.object(transcriber, "_init_model", return_value=fake_model):
            text = transcriber.transcribe("fake.ogg", language="auto")
        assert text == "ciao mondo"
        args, kwargs = fake_model.transcribe.call_args
        assert kwargs.get("language") is None
