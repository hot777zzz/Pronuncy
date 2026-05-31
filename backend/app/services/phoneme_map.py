"""ARPAbet <-> IPA phoneme mapping for English pronunciation assessment."""

import unicodedata

# ARPAbet → IPA mapping (CMUdict ARPAbet symbols to standard IPA)
ARPABET_TO_IPA: dict[str, str] = {
    # Vowels
    "AA": "ɑ",   # father
    "AE": "æ",   # cat
    "AH": "ʌ",   # cut
    "AO": "ɔ",   # caught
    "AW": "aʊ",  # cow
    "AY": "aɪ",  # buy
    "EH": "ɛ",   # bed
    "ER": "ɝ",   # bird
    "EY": "eɪ",  # bay
    "IH": "ɪ",   # bit
    "IY": "i",   # beat
    "OW": "oʊ",  # boat
    "OY": "ɔɪ",  # boy
    "UH": "ʊ",   # book
    "UW": "u",   # boot
    # Consonants
    "B": "b",
    "CH": "tʃ",  # church
    "D": "d",
    "DH": "ð",   # this
    "F": "f",
    "G": "ɡ",    # go (IPA uses U+0261)
    "HH": "h",
    "JH": "dʒ",  # judge
    "K": "k",
    "L": "l",
    "M": "m",
    "N": "n",
    "NG": "ŋ",   # sing
    "P": "p",
    "R": "ɹ",    # red (English approximant)
    "S": "s",
    "SH": "ʃ",   # shoe
    "T": "t",
    "TH": "θ",   # thin
    "V": "v",
    "W": "w",
    "Y": "j",    # yes
    "Z": "z",
    "ZH": "ʒ",   # measure
}

# Allosaurus may output additional IPA variants; normalize them to our canonical set
ALLO_NORMALIZE: dict[str, str] = {
    # Vowel variants
    "a": "ɑ",
    "ɒ": "ɔ",
    "ə": "ʌ",   # schwa → strut vowel (approximation)
    "ɐ": "ʌ",
    "ɜ": "ɝ",
    "ɚ": "ɝ",
    "e": "eɪ",
    "o": "oʊ",
    "ɵ": "oʊ",
    "ʉ": "u",
    "ɨ": "ɪ",
    # Consonant variants
    "r": "ɹ",   # trill → approximant
    "ɾ": "t",   # flap → t (simplification)
    "ʔ": "",    # glottal stop → ignore
    "g": "ɡ",   # ASCII g → IPA ɡ
    "c": "k",   # (non-English, map to nearest)
    "ɟ": "dʒ",
    "ɲ": "n",
    "ʎ": "l",
    "ʤ": "dʒ",
    "ʧ": "tʃ",
    # Stress/length markers — strip
    "ː": "",
    "ˈ": "",
    "ˌ": "",
    ".": "",
    "̩": "",   # syllabic diacritic
}

# IPA → ARPAbet reverse mapping (for display)
IPA_TO_ARPABET: dict[str, str] = {v: k for k, v in ARPABET_TO_IPA.items()}
# Handle multi-char IPA → single ARPAbet
IPA_TO_ARPABET.update({
    "aɪ": "AY",
    "aʊ": "AW",
    "eɪ": "EY",
    "oʊ": "OW",
    "ɔɪ": "OY",
    "tʃ": "CH",
    "dʒ": "JH",
})


# IPA diacritic/modifier chars to strip during normalization
_DIACRITIC_CHARS = set("ːˈˌ.ʰʲʷⁿˡ̥̬̪̺̻̹̜̟̠̩̯̃̈̽̆˞")


def normalize_phone(phone: str) -> str | None:
    """Normalize an Allosaurus IPA phone to our canonical IPA form.
    Returns None if the phone should be ignored (e.g. glottal stop).
    """
    phone = phone.strip().lower()
    if not phone:
        return None
    # Strip modifier letters / diacritics BEFORE NFKD (they decompose to regular chars)
    phone = "".join(c for c in phone if c not in _DIACRITIC_CHARS)
    # Decompose unicode to separate base chars from combining marks
    phone = unicodedata.normalize("NFKD", phone)
    # Strip any remaining combining marks (Unicode category Mn)
    phone = "".join(c for c in phone if unicodedata.category(c) != "Mn")
    if not phone:
        return None
    # Exact normalization match
    if phone in ALLO_NORMALIZE:
        result = ALLO_NORMALIZE[phone]
        return result if result else None
    return phone


def _strip_arpabet_stress(phone: str) -> str:
    """Remove stress markers (0, 1, 2) from an ARPAbet phoneme."""
    return phone.rstrip("012")


def arpabet_to_ipa(arpabet_phones: list[str]) -> list[str]:
    """Convert ARPAbet phonemes to IPA, stripping stress markers and word boundaries."""
    result = []
    for p in arpabet_phones:
        if p == " ":
            continue
        p = _strip_arpabet_stress(p)
        result.append(ARPABET_TO_IPA.get(p, p))
    return result


def arpabet_to_ipa_with_boundaries(
    arpabet_phones: list[str],
) -> tuple[list[str], list[int]]:
    """Convert ARPAbet to IPA and return word boundary indices (end of each word)."""
    result: list[str] = []
    boundaries: list[int] = []
    for p in arpabet_phones:
        if p == " ":
            boundaries.append(len(result))
        else:
            p = _strip_arpabet_stress(p)
            result.append(ARPABET_TO_IPA.get(p, p))
    boundaries.append(len(result))
    return result, boundaries


def ipa_to_arpabet(ipa_phone: str) -> str:
    """Convert a single IPA phone to ARPAbet for display."""
    return IPA_TO_ARPABET.get(ipa_phone, ipa_phone)


def phones_equal(a: str, b: str) -> bool:
    """Check if two phonemes are equivalent after normalization."""
    na = normalize_phone(a)
    nb = normalize_phone(b)
    if na is None or nb is None:
        return False
    return na == nb
