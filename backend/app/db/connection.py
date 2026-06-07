"""SQLite connection manager — minimal, no ORM."""

import sqlite3
import threading
from pathlib import Path

_SCHEMA = (Path(__file__).parent / "schema.sql").read_text(encoding="utf-8")

_conn: sqlite3.Connection | None = None
_lock = threading.Lock()


def init_db(db_path: str) -> None:
    """Create parent dirs, open connection, run DDL."""
    global _conn
    Path(db_path).parent.mkdir(parents=True, exist_ok=True)
    _conn = sqlite3.connect(db_path, check_same_thread=False)
    _conn.row_factory = sqlite3.Row
    _conn.execute("PRAGMA journal_mode=WAL")
    _conn.execute("PRAGMA foreign_keys=ON")
    _conn.executescript(_SCHEMA)
    _conn.commit()


def get_db() -> sqlite3.Connection:
    if _conn is None:
        raise RuntimeError("Database not initialized — call init_db() first")
    return _conn
