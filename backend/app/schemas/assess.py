from pydantic import BaseModel, Field


class AlignmentItem(BaseModel):
    expected: str | None
    recognized: str | None
    status: str  # correct | substitution | deletion | insertion
    start_ms: int | None = None
    end_ms: int | None = None


class WordGroup(BaseModel):
    word: str
    phoneme_start: int
    phoneme_end: int
    score: float


class AssessResponse(BaseModel):
    overall_score: float = Field(ge=0, le=100)
    alignment: list[AlignmentItem]
    expected_phones: list[str]
    recognized_phones: list[str]
    target_text: str
    recognized_text: str | None = None
    word_groups: list[WordGroup] = []
    trimmed_audio_url: str | None = None
    debug: dict | None = None
