<p align="center">
  <h1 align="center">🔊 Pronuncy</h1>
  <p align="center"><em>Your personal English pronunciation coach. Private, offline, free.</em></p>
  <p align="center">完全本地的英语发音教练 — 无需联网，无需付费，即开即用。</p>
</p>

---

<p align="center">
  <img alt="Python" src="https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white" />
  <img alt="React" src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white" />
  <img alt="License" src="https://img.shields.io/badge/license-MIT-green" />
  <img alt="CPU only" src="https://img.shields.io/badge/GPU-not%20needed-orange" />
</p>

---

## Why Pronuncy? / 为什么做这个项目？

Learning English pronunciation is hard. You repeat after an audio clip, but have no idea if you actually sound right. Existing tools either need an internet connection, charge subscription fees, or send your voice to the cloud.

Pronuncy gives you **per-phoneme feedback** — it breaks down each word into individual sounds, compares your recording against the correct pronunciation, and tells you exactly which sounds need work. Everything runs **locally on your machine**. Your voice never leaves your computer.

学英语发音最头疼的就是：跟着录音读了，但根本不知道自己读得对不对。市面上的工具要么要联网、要么要付费、要么把录音上传到云端。Pronuncy 把这一切都搬到了本地：逐音素对比你的发音和标准发音，精确到每一个元音和辅音。

---

## ✨ Features / 特色

- **🔒 100% Local / 纯本地运行** — No cloud, no account, no data collection. Your voice stays on your machine.
- **🔬 Per-phoneme Analysis / 逐音素分析** — Not just a vague "85% score". See exactly which sounds you got right and which need practice.
- **🎧 Hear the Difference / 听出差异** — Tap any phoneme card to hear **standard pronunciation** vs **your own voice** side-by-side. Precise timestamps from wav2vec2 forced alignment let you hear the exact moment.
- **🌐 Bilingual UI / 中英双语界面** — One-click toggle between English and Chinese. Great for Chinese-speaking English learners.
- **🧠 Smart Scoring / 智能评分** — Levenshtein alignment maps your phoneme sequence to the target, giving word-level and overall scores.
- **🎨 Apple-inspired Design / 苹果风格设计** — Clean, rounded, Duolingo-meets-Apple aesthetic with Tailwind CSS.
- **🧪 Offline-first / 离线可用** — Once models are downloaded (~560MB), everything works without internet.

---

## 🏗 Architecture / 架构一览

```
┌─ Your Browser ─────────────────────────────────────────┐
│  Record voice  →  POST /assess  →  Results + Playback  │
│  (React + Tailwind + i18n)                             │
└───────────────────┬────────────────────────────────────┘
                    │  multipart/form-data
                    ▼
┌─ FastAPI Backend ──────────────────────────────────────┐
│                                                        │
│  audio bytes → ffmpeg → 16kHz mono WAV                 │
│       │                                                │
│       ▼                                                │
│  WhisperX (base.en) → transcribed text                 │
│       │                                                │
│       ▼                                                │
│  wav2vec2 forced alignment → precise word timestamps   │
│       │                                                │
│       ▼                                                │
│  g2p-en → IPA phonemes per word                        │
│       │                                                │
│       ▼                                                │
│  Levenshtein DP → alignment + scores                   │
│       │                                                │
│       ▼                                                │
│  { overall_score, alignment[], word_groups[] }         │
└────────────────────────────────────────────────────────┘
```

### Model Stack / 模型栈

| Stage / 阶段 | Model / 模型 | Size / 大小 | Role / 作用 |
|:---|:---|:---|:---|
| 🎙️ Transcription | WhisperX base.en | ~150MB | Speech → text |
| 📐 Forced Alignment | wav2vec2 fairseq 960h | ~360MB | Text → precise audio timestamps |
| 🔇 Voice Detection | Pyannote VAD | ~50MB | Filter silence / noise |
| 📖 Text → Phonemes | g2p-en (CMUdict) | ~5MB | English text → IPA phonemes |
| 🔤 Sequence Matching | Levenshtein (NumPy) | — | Compare phoneme sequences |

**Total: ~560MB** — Runs on CPU. No GPU required. / 纯 CPU 运行，无需显卡。

---

## 🚀 Quick Start / 快速开始

### Prerequisites / 环境要求

- Python 3.11+ / Node.js 18+ / ffmpeg / uv

```bash
# macOS — one-liner install
brew install ffmpeg node uv
```

### 3 Steps to Run / 三步启动

```bash
# 1. Clone & install
git clone https://github.com/hot777zzz/Pronuncy.git && cd pronuncy
cd backend && uv sync && cd ../frontend && npm install && cd ..

# 2. Start backend (first run downloads models ~560MB)
cd backend && uv run uvicorn app.main:app --reload --port 8000

# 3. Start frontend (new terminal)
cd frontend && npm run dev
```

Open **http://localhost:3000**, type a sentence, hit record, and see your phoneme-by-phoneme breakdown.

---

## 📖 How to Use / 使用指南

```
1. Type a target sentence          e.g. "Hello world"
   输入你想练习的句子

2. Click the mic and read aloud    按住录音，大声朗读
   🎤 Recording...

3. Release to assess               松开自动评估
   See your score in seconds!

4. Tap any phoneme card            点击任意音素卡片
   🔊 Standard  |  🎤 Your voice   — hear the difference!
```

### Score Colors / 评分颜色

| Color | Score | Meaning |
|:---|:---|:---|
| 🟢 Green | 80–100% | Great job! / 很棒！ |
| 🟠 Orange | 50–79% | Needs practice / 还需练习 |
| 🔴 Red | 0–49% | Keep trying! / 继续加油！ |

### Phoneme Status / 音素状态

| Status | Icon | Meaning / 含义 |
|:---|:---|:---|
| `correct` | ✅ | You nailed this sound / 发音准确 |
| `substitution` | 🔄 | Wrong sound in place of the right one / 音素被替换 |
| `deletion` | ❌ | You skipped a sound / 遗漏音素 |
| `insertion` | ➕ | Extra sound that shouldn't be there / 多余音素 |

---

## 🔧 API / 接口

```bash
POST /assess
Content-Type: multipart/form-data

audio: <file>       # WAV, WebM, MP4 — auto-converted by ffmpeg
target_text: string

Response:
{
  "overall_score": 85.0,       # 0–100
  "alignment": [               # per-phoneme comparison
    {
      "expected":    "h",      # should be this IPA phoneme
      "recognized":  "h",      # you said this
      "status":      "correct",# correct | substitution | deletion | insertion
      "start_ms":    94,       # when you said it (wav2vec2-aligned)
      "end_ms":      153
    }
  ],
  "recognized_text": "hello",  # what Whisper heard
  "word_groups": [...],        # word-level breakdown with scores
  "trimmed_audio_url": "..."   # your recording (for playback)
}
```

`GET /audio/{filename}` — Serve trimmed WAV for client-side playback.

`GET /health` — `{ "status": "ok" }`

---

## 🤔 Alternatives / 同类项目对比

| Tool | Local? | Per-phoneme? | Playback? | Free? |
|:---|:---|:---|:---|:---|
| **Pronuncy** | ✅ 100% offline | ✅ IPA phoneme level | ✅ Your voice + TTS | ✅ Open source |
| ELSA Speak | ❌ Cloud only | ✅ | ❌ Limited | ❌ Subscription |
| Speechling | ❌ Cloud only | ❌ Word level only | ❌ | ⚠️ Freemium |
| Google Pronunciation | ❌ Cloud only | ❌ Black-box score | ❌ | ✅ |
| Praat (academic) | ✅ Local | ⚠️ Manual analysis | ✅ | ✅ |

Pronuncy sits in a sweet spot: **academic-grade analysis** (IPA phonemes + forced alignment) with a **consumer-friendly UI** (record a sentence, get instant color-coded feedback).

---

## 📁 Project Structure / 项目结构

```
pronuncy/
├── README.md                         # You are here
├── docker-compose.yml                # One-command Docker deployment
├── backend/
│   ├── pyproject.toml                # Python deps (uv)
│   ├── Dockerfile
│   ├── app/
│   │   ├── main.py                   # FastAPI app
│   │   ├── api/endpoints/            # assess.py, audio.py, health.py
│   │   ├── services/
│   │   │   ├── phoneme_pipeline.py   # Core: WhisperX → g2p-en → alignment
│   │   │   └── phoneme_map.py        # ARPAbet ↔ IPA (39 mappings)
│   │   ├── schemas/assess.py         # Pydantic response models
│   │   └── core/                     # Exceptions, logging, config
│   └── tests/
└── frontend/
    ├── src/
    │   ├── components/               # ResultsPanel, AudioRecorder, StatusBar
    │   ├── i18n/                     # EN/ZH translations
    │   ├── services/                 # API client, phoneme audio playback
    │   └── hooks/                    # useAudioRecorder
    ├── tailwind.config.js
    └── vite.config.ts
```

---

## 🐳 Docker / 容器部署

```bash
docker-compose up
```

Backend on `:8000`, frontend on `:3000`. Model cache volumes are mounted so you don't re-download on rebuild.

---

## 🧪 Development / 开发

```bash
# Backend tests
cd backend && uv run pytest -v

# Lint + type check
uv run ruff check app/ tests/ && uv run mypy app/

# Frontend
cd frontend && npm run build    # type-check + production build
```

---

## ⚠️ Caveats / 注意事项

- **Phoneme detection via transcription** — Pronuncy detects mispronunciations by comparing what Whisper *heard* (as text) against what you *meant* to say. If you mispronounce "world" slightly but Whisper still hears "world", the phoneme-level score stays high. Gross mispronunciations (where Whisper transcribes a different word) are reliably caught.
- **First-run download** — ~560MB of models are downloaded on first use. A fast internet connection is recommended.
- **English only** — The pipeline is tuned for English. Other languages are not supported yet.

---

<p align="center">
  <sub>Built with ❤️ for English learners everywhere. / 献给每一位英语学习者。</sub>
</p>
