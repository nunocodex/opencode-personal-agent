"""Local voice transcription with faster-whisper."""
from __future__ import annotations

import os
import warnings
from pathlib import Path

# Force HuggingFace cache into workspace before importing faster_whisper
os.environ.setdefault("HF_HOME", str(Path(__file__).parent.parent.parent / "storage" / "models"))
# Disable symlink warning on Windows (degraded caching is fine)
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"

with warnings.catch_warnings():
    warnings.simplefilter("ignore", category=UserWarning)
    from faster_whisper import WhisperModel


class VoiceTranscriber:
    """Lazy-initialised faster-whisper transcriber."""

    def __init__(self) -> None:
        self._model: WhisperModel | None = None

    def _init_model(self) -> WhisperModel:
        if self._model is None:
            print("[voice] loading faster-whisper small model (cpu, int8)...")
            with warnings.catch_warnings():
                warnings.simplefilter("ignore", category=UserWarning)
                self._model = WhisperModel("small", device="cpu", compute_type="int8")
        return self._model

    def transcribe(self, file_path: str | Path, language: str | None = None) -> str:
        model = self._init_model()
        segments, info = model.transcribe(
            str(file_path),
            language=None if language in (None, "auto") else language,
            beam_size=5,
        )
        parts = [segment.text for segment in segments]
        return " ".join(parts).strip()
