"""First-run model selection — detects installed models, prompts user, saves to .env."""

from __future__ import annotations

import sys
from pathlib import Path
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.config import Settings

# ── Available Whisper English models ──
# fmt: off
MODELS: dict[str, dict[str, str | bool]] = {
    "tiny.en": {
        "size": "~75MB",
        "accuracy": "Basic",
        "desc": "Fastest, minimal accent detection / 最快，口音检测能力弱",
        "desc_zh": "最快，口音检测能力弱",
        "recommended": False,
    },
    "base.en": {
        "size": "~150MB",
        "accuracy": "Decent",
        "desc": "Fast, basic accent detection / 快速，基础口音检测",
        "desc_zh": "快速，基础口音检测",
        "recommended": False,
    },
    "small.en": {
        "size": "~500MB",
        "accuracy": "Good",
        "desc": "Balanced speed/quality, good accent detection / 速度与质量均衡，口音检测良好",
        "desc_zh": "速度与质量均衡，口音检测良好",
        "recommended": False,
    },
    "medium.en": {
        "size": "~1.5GB",
        "accuracy": "High",
        "desc": "Best accuracy & accent detection. Recommended for pronunciation practice.",
        "desc_zh": "最佳准确率和口音检测能力，推荐用于发音练习",
        "recommended": True,
    },
}
# fmt: on

CACHE_DIR = Path.home() / ".cache" / "huggingface" / "hub"
DEFAULT_MODEL = "medium.en"


def _detect_installed() -> set[str]:
    """Return set of model names that exist in the HuggingFace cache."""
    if not CACHE_DIR.exists():
        return set()
    installed: set[str] = set()
    for name in MODELS:
        cache_name = f"models--Systran--faster-whisper-{name}"
        if (CACHE_DIR / cache_name).is_dir():
            installed.add(name)
    return installed


def ensure_model_selected(env_path: Path, settings_obj: "Settings | None" = None) -> str:
    """Check .env for WHISPER_MODEL; if missing, prompt user interactively.

    Returns the selected model name. If settings_obj is provided, updates its
    whisper_model in-place so the runtime config reflects the new value.
    """
    # Already configured — just return the value
    if env_path.exists():
        content = env_path.read_text()
        for line in content.splitlines():
            line = line.strip()
            if line.startswith("WHISPER_MODEL="):
                model = line.split("=", 1)[1].strip()
                if model in MODELS:
                    return model

    # Not configured — run interactive setup
    _interactive_select(env_path)
    selected = _read_selected(env_path)

    # Update the in-memory settings singleton so it takes effect immediately
    if settings_obj is not None:
        settings_obj.whisper_model = selected

    return selected


def _read_selected(env_path: Path) -> str:
    """Read WHISPER_MODEL from .env, falling back to default."""
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            if line.strip().startswith("WHISPER_MODEL="):
                model = line.split("=", 1)[1].strip()
                if model in MODELS:
                    return model
    return DEFAULT_MODEL


def _interactive_select(env_path: Path) -> None:
    """Prompt the user to choose a Whisper model, then write to .env."""
    installed = _detect_installed()
    names = list(MODELS.keys())
    default_idx = names.index(DEFAULT_MODEL) + 1

    # Only prompt if stdin is a terminal (skip for Docker / non-TTY)
    if not sys.stdin.isatty():
        print(
            f"\n[Pronuncy] No WHISPER_MODEL configured and no TTY detected. "
            f"Using default: {DEFAULT_MODEL}"
        )
        _write_env(env_path, DEFAULT_MODEL)
        return

    print()
    print("=" * 62)
    print("  Pronuncy — First-time Setup / 首次运行设置")
    print("=" * 62)
    print()
    print("  Select Whisper model for speech recognition:")
    print("  请选择语音识别模型：")
    print()

    for i, name in enumerate(names, 1):
        info = MODELS[name]
        tag = "[已安装 installed]" if name in installed else "[需下载 needs download]"
        rec = " ★ 推荐 recommended" if info["recommended"] else ""
        print(f"  {i}. {name:<12} {info['size']:<8} {tag}")
        print(f"     {info['desc']}{rec}")
        print()

    # Prompt
    while True:
        try:
            choice = input(
                f"  Choose / 选择 (1-{len(names)}) "
                f"[default={default_idx}={DEFAULT_MODEL}]: "
            ).strip()
            if choice == "":
                selected = DEFAULT_MODEL
                break
            idx = int(choice)
            if 1 <= idx <= len(names):
                selected = names[idx - 1]
                break
            print(f"  Please enter 1-{len(names)} / 请输入 1-{len(names)}")
        except (ValueError, EOFError, KeyboardInterrupt):
            print(f"\n  Using default / 使用默认: {DEFAULT_MODEL}")
            selected = DEFAULT_MODEL
            break

    _write_env(env_path, selected)

    tag = "已安装" if selected in installed else "首次使用将自动下载 will be downloaded on first use"
    print(f"\n  Selected / 已选择: {selected} ({tag})")
    print(f"  Config saved to / 配置已保存至: {env_path}")
    print("  Change later by editing .env / 之后可编辑 .env 修改")
    print()


def _write_env(env_path: Path, model: str) -> None:
    """Write or update WHISPER_MODEL in .env, preserving other settings."""
    existing: dict[str, str] = {}
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                if k.strip() != "WHISPER_MODEL":
                    existing[k.strip()] = v.strip()

    existing["WHISPER_MODEL"] = model
    lines = [f"{k}={v}" for k, v in existing.items()]
    env_path.write_text("\n".join(lines) + "\n")
