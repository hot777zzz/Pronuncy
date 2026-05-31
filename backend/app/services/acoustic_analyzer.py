"""Per-phoneme acoustic feature extraction and native-speaker comparison."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import numpy as np
from scipy.io import wavfile
from scipy.signal import get_window
from scipy.fft import rfft, rfftfreq

# ── Native English reference formant values (Peterson & Barney 1952, adult male) ──
# F1/F2 in Hz for each vowel. These are well-established phonetics references.
VOWEL_REFERENCE: dict[str, dict[str, float]] = {
    "i":  {"f1": 270, "f2": 2290},  # beat
    "ɪ":  {"f1": 390, "f2": 1990},  # bit
    "eɪ": {"f1": 430, "f2": 2190},  # bay (diphthong start)
    "ɛ":  {"f1": 530, "f2": 1840},  # bed
    "æ":  {"f1": 660, "f2": 1720},  # cat
    "ɑ":  {"f1": 730, "f2": 1090},  # father
    "ɔ":  {"f1": 570, "f2": 840},   # caught
    "oʊ": {"f1": 440, "f2": 1020},  # boat
    "ʊ":  {"f1": 440, "f2": 1020},  # book
    "u":  {"f1": 300, "f2": 870},   # boot
    "ʌ":  {"f1": 640, "f2": 1190},  # cup
    "ɝ":  {"f1": 490, "f2": 1350},  # bird
    "aɪ": {"f1": 640, "f2": 1310},  # buy (diphthong start)
    "aʊ": {"f1": 660, "f2": 1150},  # cow (diphthong start)
    "ɔɪ": {"f1": 500, "f2": 860},   # boy (diphthong start)
}

# Expected spectral centroid ranges for fricatives (Hz, approximate)
FRICATIVE_REFERENCE: dict[str, dict[str, float]] = {
    "s":  {"centroid_lo": 3500, "centroid_hi": 8000},
    "z":  {"centroid_lo": 3000, "centroid_hi": 7000},
    "ʃ":  {"centroid_lo": 2000, "centroid_hi": 5000},
    "ʒ":  {"centroid_lo": 2000, "centroid_hi": 4500},
    "f":  {"centroid_lo": 1000, "centroid_hi": 5000},
    "v":  {"centroid_lo": 1000, "centroid_hi": 4500},
    "θ":  {"centroid_lo": 1500, "centroid_hi": 6000},
    "ð":  {"centroid_lo": 1500, "centroid_hi": 5000},
    "h":  {"centroid_lo": 500,  "centroid_hi": 4000},
}

# Phoneme type classification
VOWELS = {"i", "ɪ", "eɪ", "ɛ", "æ", "ɑ", "ɔ", "oʊ", "ʊ", "u", "ʌ", "ɝ", "aɪ", "aʊ", "ɔɪ"}
FRICATIVES = {"s", "z", "ʃ", "ʒ", "f", "v", "θ", "ð", "h"}
STOPS = {"p", "b", "t", "d", "k", "ɡ"}
AFFRICATES = {"tʃ", "dʒ"}
NASALS = {"m", "n", "ŋ"}
APPROXIMANTS = {"l", "ɹ", "w", "j"}

# Acceptable distance thresholds (normalized)
FORMANT_DISTANCE_OK = 0.25    # < this is "good"
FORMANT_DISTANCE_WARN = 0.50  # < this is "needs work", >= is "off"


class AcousticAnalyzer:
    """Extract acoustic features per phoneme and compare to native reference."""

    def __init__(self) -> None:
        self._sample_rate: int = 16000

    def analyze(
        self,
        wav_path: Path,
        phones: list[str],
        timestamps: list[dict[str, int]],
    ) -> list[dict[str, Any]]:
        """Extract acoustic features for each phoneme segment and score vs reference.

        Returns a list of analysis items, one per phoneme.
        """
        sr, samples = wavfile.read(str(wav_path))
        self._sample_rate = sr
        if samples.dtype != np.float32:
            samples = samples.astype(np.float32) / np.iinfo(samples.dtype).max

        results: list[dict[str, Any]] = []
        for phone, ts in zip(phones, timestamps):
            start_s = ts["start_ms"] / 1000
            end_s = ts["end_ms"] / 1000
            seg = self._slice(samples, start_s, end_s)

            features = self._extract_features(seg, phone)
            comparison = self._compare_to_reference(phone, features)

            results.append({
                "phoneme": phone,
                "start_ms": ts["start_ms"],
                "end_ms": ts["end_ms"],
                "acoustic_features": features,
                "acoustic_quality": comparison.get("quality", "good"),
                "acoustic_score": comparison.get("score", 1.0),
                "acoustic_detail": comparison.get("detail", ""),
                "acoustic_tip": comparison.get("tip", ""),
            })

        return results

    def _slice(
        self, samples: np.ndarray, start_s: float, end_s: float
    ) -> np.ndarray:
        """Extract a time slice of samples, returning empty if invalid."""
        if start_s >= end_s or start_s < 0:
            return np.array([], dtype=np.float32)
        i0 = int(start_s * self._sample_rate)
        i1 = int(end_s * self._sample_rate)
        i0 = max(0, min(i0, len(samples) - 1))
        i1 = max(i0 + 1, min(i1, len(samples)))
        return samples[i0:i1].astype(np.float32)

    def _extract_features(
        self, seg: np.ndarray, phone: str
    ) -> dict[str, Any]:
        """Extract acoustic features from a phoneme segment."""
        n = len(seg)
        if n < 32:
            return {"duration_ms": 0, "rms": 0, "f0": 0, "f1": 0, "f2": 0, "spectral_centroid": 0}

        duration_ms = (n / self._sample_rate) * 1000
        rms = float(np.sqrt(np.mean(seg ** 2)) + 1e-10)

        # Pitch (F0) via simple autocorrelation
        f0 = self._estimate_f0(seg)

        # Formants via LPC-like peak picking on spectrum
        f1, f2 = self._estimate_formants(seg)

        # Spectral centroid
        centroid = self._spectral_centroid(seg)

        return {
            "duration_ms": round(duration_ms, 1),
            "rms": round(rms, 6),
            "f0": round(f0, 1),
            "f1": round(f1, 1),
            "f2": round(f2, 1),
            "spectral_centroid": round(centroid, 1),
        }

    def _estimate_f0(self, seg: np.ndarray) -> float:
        """Estimate fundamental frequency via autocorrelation."""
        n = len(seg)
        seg_w = seg * np.hanning(n)
        corr = np.correlate(seg_w, seg_w, mode="full")
        corr = corr[n - 1:]

        # Search for peaks in plausible F0 range (80–400 Hz)
        min_lag = int(self._sample_rate / 400)
        max_lag = int(self._sample_rate / 80)
        if max_lag >= len(corr):
            return 0.0
        corr_voiced = corr[min_lag:max_lag]
        peak = int(np.argmax(corr_voiced)) + min_lag

        if corr[peak] < corr[0] * 0.3:
            return 0.0  # unvoiced or weak signal
        return self._sample_rate / peak

    def _estimate_formants(self, seg: np.ndarray) -> tuple[float, float]:
        """Estimate F1/F2 by applying LPC preemphasis and peak-picking the spectrum."""
        n = len(seg)

        # Preemphasis: y[n] = x[n] - 0.97 * x[n-1]
        preemph = seg.copy()
        preemph[1:] = preemph[1:] - 0.97 * preemph[:-1]
        preemph[0] = 0

        windowed = preemph * get_window("hann", n)
        n_fft = max(512, 2 ** int(np.ceil(np.log2(n))))
        spec = np.abs(rfft(windowed, n=n_fft))
        freqs = rfftfreq(n_fft, 1 / self._sample_rate)

        # Find spectral peaks in plausible formant ranges
        f1_range = (200, 1000)
        f2_range = (500, 3000)

        def find_peak(fmin: float, fmax: float) -> float:
            mask = (freqs >= fmin) & (freqs <= fmax)
            if not mask.any():
                return 0.0
            idx = int(np.argmax(spec[mask]))
            return float(freqs[mask][idx])

        return find_peak(*f1_range), find_peak(*f2_range)

    def _spectral_centroid(self, seg: np.ndarray) -> float:
        """Compute spectral centroid (center of mass of the spectrum)."""
        n = len(seg)
        windowed = seg * get_window("hann", n)
        n_fft = max(512, 2 ** int(np.ceil(np.log2(n))))
        spec = np.abs(rfft(windowed, n=n_fft))
        freqs = rfftfreq(n_fft, 1 / self._sample_rate)
        total = spec.sum()
        if total == 0:
            return 0.0
        return float(np.sum(freqs * spec) / total)

    def _compare_to_reference(
        self, phone: str, features: dict[str, Any]
    ) -> dict[str, Any]:
        """Compare extracted features against native reference values."""
        if phone in VOWELS:
            return self._compare_vowel(phone, features)
        elif phone in FRICATIVES:
            return self._compare_fricative(phone, features)
        else:
            # Consonants: basic check via duration and RMS
            dur = features.get("duration_ms", 0)
            if dur < 10:
                return {"quality": "off", "score": 0.3, "detail": "too short, might be skipped"}
            return {"quality": "good", "score": 1.0, "detail": ""}

    def _compare_vowel(
        self, phone: str, features: dict[str, Any]
    ) -> dict[str, Any]:
        """Compare vowel formants to Peterson & Barney reference."""
        ref = VOWEL_REFERENCE.get(phone)
        if not ref:
            return {"quality": "good", "score": 0.8, "detail": ""}

        f1 = features.get("f1", 0)
        f2 = features.get("f2", 0)
        if f1 <= 0 or f2 <= 0:
            return {"quality": "ok", "score": 0.6, "detail": "could not measure formants"}

        # Normalized Euclidean distance in F1-F2 space
        f1_dist = abs(f1 - ref["f1"]) / max(ref["f1"], 100)
        f2_dist = abs(f2 - ref["f2"]) / max(ref["f2"], 100)
        dist = np.sqrt(f1_dist ** 2 + f2_dist ** 2)

        if dist < FORMANT_DISTANCE_OK:
            detail = f"F1={f1:.0f} F2={f2:.0f} Hz — close to native"
            return {"quality": "good", "score": round(1.0 - dist * 0.3, 2), "detail": detail}
        elif dist < FORMANT_DISTANCE_WARN:
            detail = f"F1={f1:.0f} F2={f2:.0f} Hz — slightly off (ref F1={ref['f1']:.0f} F2={ref['f2']:.0f})"
            return {"quality": "ok", "score": round(1.0 - dist * 0.5, 2), "detail": detail}
        else:
            # Attempt to identify what the vowel sounds like
            nearest = self._nearest_vowel(f1, f2)
            detail = f"F1={f1:.0f} F2={f2:.0f} Hz — sounds closer to /{nearest}/ than /{phone}/"
            tip = VOWEL_TIPS.get(phone, {}).get(nearest, "")
            return {
                "quality": "off",
                "score": round(max(0, 1.0 - dist * 0.7), 2),
                "detail": detail,
                "tip": tip,
            }

    def _compare_fricative(
        self, phone: str, features: dict[str, Any]
    ) -> dict[str, Any]:
        """Compare fricative spectral centroid to reference range."""
        ref = FRICATIVE_REFERENCE.get(phone)
        if not ref:
            return {"quality": "good", "score": 0.8, "detail": ""}

        sc = features.get("spectral_centroid", 0)
        if sc < ref["centroid_lo"]:
            detail = f"centroid={sc:.0f} Hz — too low, sounds muffled"
            return {"quality": "off", "score": 0.4, "detail": detail}
        elif sc > ref["centroid_hi"]:
            detail = f"centroid={sc:.0f} Hz — too high, sounds sharp"
            return {"quality": "ok", "score": 0.6, "detail": detail}
        else:
            detail = f"centroid={sc:.0f} Hz — in native range"
            return {"quality": "good", "score": 0.9, "detail": detail}

    def _nearest_vowel(self, f1: float, f2: float) -> str:
        """Find closest reference vowel by F1/F2 distance."""
        best = ""
        best_dist = float("inf")
        for phone, ref in VOWEL_REFERENCE.items():
            d = np.sqrt(
                ((f1 - ref["f1"]) / max(ref["f1"], 100)) ** 2
                + ((f2 - ref["f2"]) / max(ref["f2"], 100)) ** 2
            )
            if d < best_dist:
                best_dist = d
                best = phone
        return best


# ── Common vowel mispronunciation tips (L1=Chinese) ──
VOWEL_TIPS: dict[str, dict[str, str]] = {
    "i": {
        "ɪ": "Try spreading your lips wider — /i/ is longer and tenser than /ɪ/.",
    },
    "ɪ": {
        "i": "Relax your tongue — /ɪ/ is shorter and looser than /i/.",
    },
    "æ": {
        "ɛ": "Open your mouth wider and drop your jaw for /æ/.",
        "ɑ": "The tongue should be more forward for /æ/.",
    },
    "ʌ": {
        "ɑ": "Keep your tongue central, not back. /ʌ/ is in the middle of the mouth.",
    },
    "ʊ": {
        "u": "Relax your lips — /ʊ/ is less rounded than /u/.",
    },
    "u": {
        "ʊ": "Round your lips more tightly and push tongue higher for /u/.",
    },
    "ɔ": {
        "oʊ": "Open your mouth more — /ɔ/ has a wider jaw position than /oʊ/.",
    },
}
