"""Pydantic models for history and progress endpoints."""

from datetime import datetime

from pydantic import BaseModel


class HistoryItem(BaseModel):
    id: str
    target_text: str
    overall_score: float
    acoustic_score: float | None
    created_at: str


class HistoryListResponse(BaseModel):
    items: list[HistoryItem]
    total: int


class ProgressPoint(BaseModel):
    assessment_id: str
    status: str
    recognized_as: str | None
    acoustic_score: float | None
    overall_score: float
    created_at: str


class PhonemeProgress(BaseModel):
    phoneme: str
    total_attempts: int
    correct_count: int
    average_acoustic: float | None
    average_overall: float | None
    last_practiced: str | None
    recent_history: list[ProgressPoint]


class ProgressResponse(BaseModel):
    phonemes: list[PhonemeProgress]
