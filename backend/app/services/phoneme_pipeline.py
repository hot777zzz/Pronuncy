"""Core phoneme recognition and scoring pipeline."""

from __future__ import annotations

import re
import subprocess
import tempfile
import time
import uuid
from pathlib import Path
from typing import Any

import numpy as np
import whisperx
from g2p_en import G2p

from app.config import settings
from app.core.exceptions import AudioDecodeError, ModelInferenceError

from .acoustic_analyzer import AcousticAnalyzer
from .accent_profiles import load_profile, match_tip
from .phoneme_map import (
    arpabet_to_ipa_with_boundaries,
    phones_equal,
)

# Where trimmed WAVs are stored for client-side playback
TRIMMED_DIR = Path(tempfile.gettempdir()) / "pronuncy_audio"
TRIMMED_DIR.mkdir(parents=True, exist_ok=True)

# Cleanup files older than this (seconds)
MAX_AGE_SEC = 600


def _cleanup_old_files() -> None:
    """Remove trimmed audio files older than MAX_AGE_SEC."""
    now = time.time()
    for f in TRIMMED_DIR.glob("*.wav"):
        try:
            if now - f.stat().st_mtime > MAX_AGE_SEC:
                f.unlink(missing_ok=True)
        except OSError:
            pass


# Punctuation chars stripped from word boundaries (keeps internal apostrophes/hyphens)
_WORD_PUNCT_RE = re.compile(r"^[.,!?;:\"()\[\]{}'`'']+|[.,!?;:\"()\[\]{}'`'']+$")


def _strip_word_punct(word: str) -> str:
    """Remove leading/trailing sentence punctuation from a word."""
    return _WORD_PUNCT_RE.sub("", word).strip()


def _strip_text_punct(text: str) -> str:
    """Remove sentence punctuation from full text, collapsing whitespace."""
    cleaned = re.sub(r"[.,!?;:()\[\]{}\"']", " ", text)
    return re.sub(r"\s+", " ", cleaned).strip()


class PhonemePipeline:
    def __init__(self) -> None:
        self.g2p = G2p()
        self.device = "cpu"
        self.compute_type = "int8"

        # WhisperX wraps faster-whisper transcription + wav2vec2 forced alignment
        self.whisper = whisperx.load_model(
            settings.whisper_model, device=self.device, compute_type=self.compute_type
        )
        self.align_model, self.align_metadata = whisperx.load_align_model(
            language_code="en", device=self.device
        )
        self.acoustic = AcousticAnalyzer()
        self._trimmed_wav_path: Path | None = None

    @property
    def trimmed_audio_url(self) -> str | None:
        if self._trimmed_wav_path and self._trimmed_wav_path.exists():
            return f"/audio/{self._trimmed_wav_path.name}"
        return None

    def target_text_to_phonemes(self, text: str) -> tuple[list[str], list[int]]:
        return arpabet_to_ipa_with_boundaries(self.g2p(_strip_text_punct(text)))

    def audio_to_phonemes(
        self, audio_bytes: bytes
    ) -> tuple[list[str], list[dict[str, int]], str]:
        wav_path = self._convert_to_wav(audio_bytes)
        try:
            phones, timestamps, recognized_text = self._recognize_with_timestamps(
                wav_path
            )
            self._save_trimmed(wav_path)
            return phones, timestamps, recognized_text
        finally:
            wav_path.unlink(missing_ok=True)

    def _save_trimmed(self, src: Path) -> None:
        """Copy the processed WAV to the persistent trimmed directory."""
        dst = TRIMMED_DIR / f"{uuid.uuid4().hex}.wav"
        try:
            dst.write_bytes(src.read_bytes())
            self._trimmed_wav_path = dst
        except OSError:
            pass

    def _recognize_with_timestamps(
        self, wav_path: Path
    ) -> tuple[list[str], list[dict[str, int]], str]:
        """Transcribe with WhisperX + wav2vec2 forced alignment for accurate word timestamps.

        Returns:
            phones: normalized IPA phoneme list
            timestamps: list of {start_ms, end_ms} per recognized phoneme
            recognized_text: the full transcribed text
        """
        try:
            audio = whisperx.load_audio(str(wav_path))
            result = self.whisper.transcribe(audio, batch_size=16, language="en")
            result = whisperx.align(
                result["segments"],
                self.align_model,
                self.align_metadata,
                audio,
                self.device,
            )
        except Exception as e:
            raise ModelInferenceError(f"Phoneme recognition failed: {e}") from e

        phones: list[str] = []
        timestamps: list[dict[str, int]] = []
        text_parts: list[str] = []

        for segment in result.get("segments", []):
            seg_text = _strip_text_punct(segment.get("text", ""))
            if seg_text:
                text_parts.append(seg_text)

            words = segment.get("words", [])
            if not words:
                seg_ipa, _ = arpabet_to_ipa_with_boundaries(self.g2p(seg_text))
                phones.extend(seg_ipa)
                for _ in seg_ipa:
                    timestamps.append({"start_ms": 0, "end_ms": 0})
                continue

            for word in words:
                word_text = _strip_word_punct(word.get("word", ""))
                if not word_text:
                    continue
                word_arpabet = self.g2p(word_text)
                word_ipa, _ = arpabet_to_ipa_with_boundaries(word_arpabet)
                if not word_ipa:
                    continue

                n = len(word_ipa)
                ws = word.get("start")
                we = word.get("end")
                if ws is None or we is None or we <= ws:
                    for phone in word_ipa:
                        phones.append(phone)
                        timestamps.append({"start_ms": 0, "end_ms": 0})
                    continue

                word_dur_ms = (we - ws) * 1000
                chunk = word_dur_ms / n
                for j, phone in enumerate(word_ipa):
                    phones.append(phone)
                    timestamps.append({
                        "start_ms": round(ws * 1000 + j * chunk),
                        "end_ms": round(ws * 1000 + (j + 1) * chunk),
                    })

        recognized_text = " ".join(text_parts)
        return phones, timestamps, recognized_text

    def _convert_to_wav(self, audio_bytes: bytes) -> Path:
        tmp_in = tempfile.NamedTemporaryFile(suffix=".audio", delete=False)
        tmp_in.write(audio_bytes)
        tmp_in.close()

        out_path = Path(tempfile.NamedTemporaryFile(suffix=".wav", delete=False).name)

        try:
            subprocess.run(
                [
                    "ffmpeg", "-y", "-i", tmp_in.name,
                    "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1",
                    "-af", "silenceremove=start_periods=1:start_silence=0.3:start_threshold=-50dB:stop_periods=0",
                    "-loglevel", "error", str(out_path),
                ],
                check=True,
                timeout=10,
            )
        except subprocess.CalledProcessError as e:
            raise AudioDecodeError(f"Audio conversion failed: {e}") from e
        finally:
            Path(tmp_in.name).unlink(missing_ok=True)

        return out_path

    def align_and_score(
        self, expected: list[str], recognized: list[str]
    ) -> dict[str, Any]:
        m, n = len(expected), len(recognized)
        dp = np.zeros((m + 1, n + 1), dtype=np.int32)
        for i in range(m + 1):
            dp[i, 0] = i
        for j in range(n + 1):
            dp[0, j] = j

        for i in range(1, m + 1):
            for j in range(1, n + 1):
                cost = 0 if phones_equal(expected[i - 1], recognized[j - 1]) else 1
                dp[i, j] = min(
                    dp[i - 1, j] + 1,
                    dp[i, j - 1] + 1,
                    dp[i - 1, j - 1] + cost,
                )

        alignment: list[dict[str, str | None]] = []
        i, j = m, n
        while i > 0 or j > 0:
            if i > 0 and j > 0:
                cost = 0 if phones_equal(expected[i - 1], recognized[j - 1]) else 1
                if dp[i, j] == dp[i - 1, j - 1] + cost:
                    status: str = "correct" if cost == 0 else "substitution"
                    alignment.append({
                        "expected": expected[i - 1],
                        "recognized": recognized[j - 1],
                        "status": status,
                    })
                    i -= 1
                    j -= 1
                    continue
            if i > 0 and dp[i, j] == dp[i - 1, j] + 1:
                alignment.append({
                    "expected": expected[i - 1],
                    "recognized": None,
                    "status": "deletion",
                })
                i -= 1
            elif j > 0 and dp[i, j] == dp[i, j - 1] + 1:
                alignment.append({
                    "expected": None,
                    "recognized": recognized[j - 1],
                    "status": "insertion",
                })
                j -= 1

        alignment.reverse()

        expected_count = len(expected)
        correct_in_expected = sum(
            1 for a in alignment
            if a["status"] == "correct" and a["expected"] is not None
        )
        overall_score = (
            round(correct_in_expected / expected_count * 100, 1)
            if expected_count > 0 else 100.0
        )

        return {
            "overall_score": overall_score,
            "alignment": alignment,
            "expected_phones": expected,
            "recognized_phones": recognized,
        }

    def assess(self, audio_bytes: bytes, target_text: str) -> dict[str, Any]:
        _cleanup_old_files()
        clean_target = _strip_text_punct(target_text)
        expected, boundaries = self.target_text_to_phonemes(target_text)
        recognized, rec_timestamps, recognized_text = self.audio_to_phonemes(
            audio_bytes
        )
        result = self.align_and_score(expected, recognized)

        # Map recognized timestamps to alignment items
        rec_idx = 0
        for item in result["alignment"]:
            if item["recognized"] is not None and rec_idx < len(rec_timestamps):
                ts = rec_timestamps[rec_idx]
                item["start_ms"] = ts["start_ms"]
                item["end_ms"] = ts["end_ms"]
                rec_idx += 1

        # Build word-level groups (use clean text without punctuation)
        words = clean_target.split()
        word_groups: list[dict[str, Any]] = []
        start = 0
        for i, end in enumerate(boundaries):
            phoneme_indices = list(range(start, end))
            correct_in_word = sum(
                1 for j in phoneme_indices
                if j < len(result["alignment"])
                and result["alignment"][j]["status"] == "correct"
            )
            word_score = (
                round(correct_in_word / len(phoneme_indices) * 100, 1)
                if phoneme_indices else 100.0
            )
            word_groups.append({
                "word": words[i] if i < len(words) else "",
                "phoneme_start": start,
                "phoneme_end": end,
                "score": word_score,
            })
            start = end

        result["target_text"] = clean_target
        result["recognized_text"] = recognized_text
        result["word_groups"] = word_groups
        result["trimmed_audio_url"] = self.trimmed_audio_url

        # ── Acoustic analysis ──
        if (
            recognized
            and rec_timestamps
            and self._trimmed_wav_path
            and self._trimmed_wav_path.exists()
        ):
            try:
                acoustic_results = self.acoustic.analyze(
                    self._trimmed_wav_path, recognized, rec_timestamps
                )
            except Exception:
                acoustic_results = []

            # Map acoustic results to alignment items
            ac_idx = 0
            for item in result["alignment"]:
                if item["recognized"] is not None and ac_idx < len(acoustic_results):
                    ac = acoustic_results[ac_idx]
                    item["acoustic"] = {
                        "phoneme": ac["phoneme"],
                        "start_ms": ac["start_ms"],
                        "end_ms": ac["end_ms"],
                        "quality": ac["acoustic_quality"],
                        "score": ac["acoustic_score"],
                        "detail": ac.get("acoustic_detail", ""),
                        "tip": ac.get("acoustic_tip", ""),
                        "features": ac.get("acoustic_features"),
                    }
                    ac_idx += 1

            # Compute acoustic score from recognized phonemes with timestamps
            if acoustic_results:
                valid_scores = [
                    a["acoustic_score"] for a in acoustic_results if a["acoustic_score"] > 0
                ]
                if valid_scores:
                    result["acoustic_score"] = round(
                        sum(valid_scores) / len(valid_scores) * 100, 1
                    )

            # Match against accent knowledge base
            profile = load_profile("zh-CN")
            if profile:
                tips: list[dict[str, str]] = []
                seen_patterns: set[str] = set()
                for item in result["alignment"]:
                    if (
                        item["status"] == "substitution"
                        and item["expected"]
                        and item["recognized"]
                    ):
                        pattern_key = f"{item['expected']}→{item['recognized']}"
                        if pattern_key in seen_patterns:
                            continue
                        seen_patterns.add(pattern_key)
                        tip_text = match_tip(
                            item["expected"], item["recognized"], "zh-CN"
                        )
                        if tip_text:
                            pattern_info = None
                            for p in profile.get("patterns", []):
                                if p["from"] == item["expected"] and p["to"] == item["recognized"]:
                                    pattern_info = p
                                    break
                            tips.append({
                                "phoneme": item["expected"],
                                "pattern": pattern_key,
                                "frequency": pattern_info.get("frequency", "medium") if pattern_info else "medium",
                                "tip": tip_text,
                            })
                result["accent_tips"] = tips

        result["debug"] = {
            "expected_phones": expected,
            "recognized_phones": recognized,
        }
        return result
