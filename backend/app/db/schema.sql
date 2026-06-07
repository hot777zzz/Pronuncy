-- Pronuncy v0.4 database schema

CREATE TABLE IF NOT EXISTS assessments (
    id                TEXT PRIMARY KEY,
    session_id        TEXT NOT NULL,
    target_text       TEXT NOT NULL,
    recognized_text   TEXT,
    overall_score     REAL NOT NULL,
    acoustic_score    REAL,
    expected_phones   TEXT NOT NULL,    -- JSON array
    recognized_phones TEXT NOT NULL,    -- JSON array
    word_groups       TEXT,             -- JSON array
    accent_tips       TEXT,             -- JSON array
    trimmed_audio_url TEXT,
    accent_profile    TEXT DEFAULT 'zh-CN',
    created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS alignment_items (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    assessment_id    TEXT NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    idx              INTEGER NOT NULL,
    expected_phone   TEXT,
    recognized_phone TEXT,
    status           TEXT NOT NULL,
    start_ms         INTEGER,
    end_ms           INTEGER,
    acoustic_quality TEXT,
    acoustic_score   REAL,
    acoustic_detail  TEXT,
    acoustic_tip     TEXT
);

CREATE TABLE IF NOT EXISTS phoneme_history (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    assessment_id   TEXT NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    session_id      TEXT NOT NULL,
    phoneme         TEXT NOT NULL,
    recognized_as   TEXT,
    status          TEXT NOT NULL,
    acoustic_score  REAL,
    overall_score   REAL NOT NULL,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS agent_feedback_cache (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    assessment_id  TEXT NOT NULL UNIQUE REFERENCES assessments(id) ON DELETE CASCADE,
    provider       TEXT NOT NULL,
    model          TEXT NOT NULL,
    feedback_json  TEXT NOT NULL,
    created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_assessments_session
    ON assessments(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alignment_assessment
    ON alignment_items(assessment_id);
CREATE INDEX IF NOT EXISTS idx_phoneme_history_lookup
    ON phoneme_history(session_id, phoneme, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_phoneme_history_session
    ON phoneme_history(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_cache
    ON agent_feedback_cache(assessment_id);
