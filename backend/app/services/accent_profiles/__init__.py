"""Accent profile loader. Maps L1 → English transfer patterns with tips."""

from __future__ import annotations

from pathlib import Path
from typing import Any

# Profile directory relative to this file
_PROFILE_DIR = Path(__file__).parent


# ── Inline profile data ──
# Profiles can also be loaded from YAML files if pyyaml is available.
# For now they're defined directly to avoid adding a dependency.

PROFILES: dict[str, dict[str, Any]] = {
    "zh-CN": {
        "name": "Chinese (Mandarin)",
        "name_zh": "中文（普通话）",
        "description": "Common English pronunciation patterns for native Chinese speakers.",
        "patterns": [
            {
                "from": "θ",
                "to": "s",
                "frequency": "very_high",
                "category": "fricative",
                "tip": "Place your tongue tip between your upper and lower teeth, then blow air gently. Chinese doesn't have this sound, so learners often substitute /s/.",
                "tip_zh": "把舌尖轻轻放在上下齿之间，然后吹气。中文里没有这个音，所以学习者常用 /s/ 替代。",
            },
            {
                "from": "ð",
                "to": "d",
                "frequency": "very_high",
                "category": "fricative",
                "tip": "Same mouth position as /θ/, but your vocal cords should vibrate. Think of the 'th' in 'this'.",
                "tip_zh": "口型与 /θ/ 相同，但声带需要振动。想想 'this' 中的 'th' 音。",
            },
            {
                "from": "v",
                "to": "w",
                "frequency": "high",
                "category": "fricative",
                "tip": "Place your upper teeth on your lower lip and vibrate. Don't round your lips like /w/.",
                "tip_zh": "上牙轻轻咬住下唇，声带振动。不要像发 /w/ 那样撅起嘴唇。",
            },
            {
                "from": "ʒ",
                "to": "ɹ",
                "frequency": "medium",
                "category": "fricative",
                "tip": "This is the 's' in 'measure'. Round your lips slightly and push air through a narrow gap.",
                "tip_zh": "这是 'measure' 中的 's' 音。嘴唇微圆，气流从狭窄缝隙中挤出。",
            },
            {
                "from": "dʒ",
                "to": "ʒ",
                "frequency": "medium",
                "category": "affricate",
                "tip": "Start with a /d/ stop, then release into /ʒ/. It's one smooth motion.",
                "tip_zh": "先用舌尖抵住上颚发 /d/，然后平滑过渡到 /ʒ/。这是一个连贯动作。",
            },
            {
                "from": "ɪ",
                "to": "i",
                "frequency": "high",
                "category": "vowel",
                "tip": "Relax your tongue and keep it slightly lower. /ɪ/ (as in 'bit') is shorter and looser than /i/ (as in 'beat').",
                "tip_zh": "舌头放松，位置稍低。/ɪ/（如 'bit'）比 /i/（如 'beat'）更短更松。",
            },
            {
                "from": "æ",
                "to": "ɛ",
                "frequency": "high",
                "category": "vowel",
                "tip": "Open your mouth wider — drop your jaw more than you think. /æ/ (as in 'cat') needs more vertical space.",
                "tip_zh": "嘴巴张得更大一些——下巴比你想的要降得更低。/æ/（如 'cat'）需要更大的垂直空间。",
            },
            {
                "from": "ʌ",
                "to": "ɑ",
                "frequency": "medium",
                "category": "vowel",
                "tip": "Keep your tongue centered, not pulled back. /ʌ/ is a neutral middle-of-the-mouth vowel.",
                "tip_zh": "舌头保持在中间位置，不要后缩。/ʌ/ 是一个中性的口腔中央元音。",
            },
            {
                "from": "ʊ",
                "to": "u",
                "frequency": "medium",
                "category": "vowel",
                "tip": "Round your lips less and keep your tongue slightly lower. /ʊ/ is a relaxed short vowel.",
                "tip_zh": "嘴唇不要撅得太圆，舌头位置稍低。/ʊ/ 是一个轻松的短元音。",
            },
            {
                "from": "n",
                "to": "l",
                "frequency": "medium",
                "category": "nasal",
                "tip": "For /n/, the tongue tip touches the alveolar ridge and air goes through the nose. For /l/, air goes around the sides of the tongue.",
                "tip_zh": "发 /n/ 时舌尖抵住上齿龈，气流从鼻腔出。发 /l/ 时气流从舌两侧出。这两个音在中文里区分明显，注意不要在词尾混淆。",
            },
            {
                "from": "ŋ",
                "to": "n",
                "frequency": "low",
                "category": "nasal",
                "tip": "The back of your tongue should touch the soft palate for /ŋ/ (as in 'sing'). Don't let the tip touch.",
                "tip_zh": "舌后部抬起接触软腭发 /ŋ/（如 'sing'）。舌尖不要碰到上颚。",
            },
            {
                "from": "ɹ",
                "to": "l",
                "frequency": "medium",
                "category": "approximant",
                "tip": "Curl your tongue tip back without touching the roof of your mouth. English /r/ is a retroflex approximant.",
                "tip_zh": "舌尖向后卷起但不接触上颚。英语的 /r/ 是卷舌近音，与中文的 'r' 也不同。",
            },
        ],
    },
}


def load_profile(l1_code: str) -> dict[str, Any] | None:
    """Load an accent profile by L1 language code (e.g. 'zh-CN')."""
    return PROFILES.get(l1_code)


def match_tip(
    expected_phone: str,
    actual_phone: str,
    l1_code: str = "zh-CN",
) -> str | None:
    """Find a pronunciation tip matching this substitution pattern."""
    profile = PROFILES.get(l1_code)
    if not profile:
        return None
    for p in profile.get("patterns", []):
        if p["from"] == expected_phone and p["to"] == actual_phone:
            return p["tip"]
    return None


def get_profile_summary(l1_code: str) -> dict[str, Any] | None:
    """Return profile metadata without full pattern list."""
    profile = PROFILES.get(l1_code)
    if not profile:
        return None
    return {
        "code": l1_code,
        "name": profile["name"],
        "description": profile["description"],
    }
