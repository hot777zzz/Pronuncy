from pydantic import BaseModel, Field


class AcousticDetail(BaseModel):
    """Per-phoneme acoustic analysis result."""

    phoneme: str
    start_ms: int
    end_ms: int
    quality: str  # good | ok | off
    score: float  # 0–1 acoustic similarity to native reference
    detail: str = ""  # human-readable measurement summary
    tip: str = ""  # personalized correction tip (if available)
    features: dict | None = None  # raw acoustic features


class AlignmentItem(BaseModel):
    expected: str | None
    recognized: str | None
    status: str  # correct | substitution | deletion | insertion
    start_ms: int | None = None
    end_ms: int | None = None
    acoustic: AcousticDetail | None = None


class WordGroup(BaseModel):
    word: str
    phoneme_start: int
    phoneme_end: int
    score: float


class AccentTip(BaseModel):
    """Targeted correction tip from accent knowledge base."""

    phoneme: str
    pattern: str  # e.g. "θ → s"
    frequency: str  # very_high | high | medium | low
    tip: str


class AssessResponse(BaseModel):
    overall_score: float = Field(ge=0, le=100)
    acoustic_score: float | None = Field(default=None, ge=0, le=100)
    alignment: list[AlignmentItem]
    expected_phones: list[str]
    recognized_phones: list[str]
    target_text: str
    recognized_text: str | None = None
    word_groups: list[WordGroup] = []
    accent_tips: list[AccentTip] = []
    trimmed_audio_url: str | None = None
    debug: dict | None = None
    assessment_id: str = ""
    session_id: str = ""
