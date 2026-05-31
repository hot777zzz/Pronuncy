<p align="center">
  <img src="assets/logo.png" alt="Pronuncy logo" width="180" />
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

学英语发音最头疼的就是：跟着录音读了，但根本不知道自己读得对不对。市面上的工具要么要联网、要么要付费、要么把录音上传到云端。

Pronuncy 把这一切都搬到了本地：逐音素对比你的发音和标准发音，精确到每一个元音和辅音。所有内容都在本地运行，你的声音不会离开你的电脑。

---

## ✨ Features / 特色

- **🔒 100% Local / 纯本地运行** — No cloud, no account, no data collection. Your voice stays on your machine.
- **🔬 Per-phoneme Analysis / 逐音素分析** — Not just a vague "85% score". See exactly which sounds you got right and which need practice.
- **🔊 Acoustic Quality Score / 声学质量评分** — Measures your actual sound production — formants for vowels, spectral centroid for fricatives, duration and energy. Compared against native speaker reference values (Peterson & Barney).
- **💡 Personalized Tips / 个性化纠正建议** — Matches your error patterns against an L1 accent knowledge base. For example, if you substitute /θ/ with /s/, you get a specific tip about tongue placement between the teeth.
- **🎧 Hear the Difference / 听出差异** — Tap any phoneme card to hear **standard pronunciation** (target word) vs **your own voice** (exact phoneme slice from your recording).
- **🌐 Bilingual UI / 中英双语界面** — One-click toggle between English and Chinese. Tips and UI both translated.
- **🧠 Smart Scoring / 智能评分** — Dual scores: Levenshtein alignment (phoneme identity) + acoustic analysis (sound quality).
- **🧪 Offline-first / 离线可用** — Once models are downloaded (~1.9GB), everything works without internet.

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
│  WhisperX (medium.en) → transcribed text               │
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
│  Acoustic analysis → formants, spectral, duration      │
│       │                                                │
│       ▼                                                │
│  Accent knowledge base → personalized tips             │
│       │                                                │
│       ▼                                                │
│  { score, alignment[], acoustic[], tips[] }            │
└────────────────────────────────────────────────────────┘
```

### Model Stack / 模型栈

| Stage / 阶段         | Model / 模型          | Size / 大小 | Role / 作用                              |
| :------------------- | :-------------------- | :---------- | :--------------------------------------- |
| 🎙️ Transcription     | WhisperX medium.en    | ~1.5GB      | Speech → text                            |
| 📐 Forced Alignment  | wav2vec2 fairseq 960h | ~360MB      | Text → precise audio timestamps          |
| 🔇 Voice Detection   | Pyannote VAD          | ~50MB       | Filter silence / noise                   |
| 📖 Text → Phonemes   | g2p-en (CMUdict)      | ~5MB        | English text → IPA phonemes              |
| 🔊 Acoustic Analysis | NumPy/SciPy DSP       | —           | Formants, spectral, duration per phoneme |
| 🧠 Accent KB         | Rule engine (YAML)    | —           | L1→English transfer pattern matching     |
| 🔤 Sequence Matching | Levenshtein DP        | —           | Compare phoneme sequences                |

**Total: ~1.9GB** — Runs on CPU. No GPU required. / 纯 CPU 运行，无需显卡。

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

# 2. Start backend (first run: choose model → download ~75MB–1.9GB)
cd backend && uv run uvicorn app.main:app --reload --port 8000

# 3. Start frontend (new terminal)
cd frontend && npm run dev
```

On first startup, you'll be prompted to choose a Whisper model. Already-downloaded models are marked `[installed]` and work immediately. Others will auto-download on first use. / 首次启动时可在终端中选择 Whisper 模型，已下载的模型标注 `[已安装]` 可立即使用，未下载的首次使用时会自动下载。

### Model Selection / 模型选择

On first run, Pronuncy detects which models are cached locally and lets you pick:

首次运行时，Pronuncy 会检测本地已缓存的模型，让你选择：

| Model / 模型 | Size / 大小 | Accuracy / 准确率 | Accent Detection / 口音检测 |
|:---|:---|:---|:---|
| `tiny.en` | ~75MB | Basic / 基础 | Minimal / 极弱 |
| `base.en` | ~150MB | Decent / 尚可 | Basic / 基础 |
| `small.en` | ~500MB | Good / 良好 | Good / 良好 |
| **`medium.en`** ★ | **~1.5GB** | **High / 高** | **Best / 最佳（推荐）** |

> ★ recommended / 推荐

Selection is saved to `backend/.env` (`WHISPER_MODEL=xxx`). To switch models later, edit that file and restart. / 选择会保存到 `backend/.env` 文件，之后修改 `WHISPER_MODEL=xxx` 并重启即可切换。

```bash
# Example: switch to small.en after initial setup
echo "WHISPER_MODEL=small.en" >> backend/.env
```

Open **http://localhost:3000**, type a sentence, hit record, and see your phoneme-by-phoneme breakdown. / 打开浏览器，输入句子，点击录音，即可看到逐音素评估结果。

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

| Color     | Score   | Meaning                   |
| :-------- | :------ | :------------------------ |
| 🟢 Green  | 80–100% | Great job! / 很棒！       |
| 🟠 Orange | 50–79%  | Needs practice / 还需练习 |
| 🔴 Red    | 0–49%   | Keep trying! / 继续加油！ |

### Phoneme Status / 音素状态

| Status         | Icon | Meaning / 含义                                     |
| :------------- | :--- | :------------------------------------------------- |
| `correct`      | ✅   | You nailed this sound / 发音准确                   |
| `substitution` | 🔄   | Wrong sound in place of the right one / 音素被替换 |
| `deletion`     | ❌   | You skipped a sound / 遗漏音素                     |
| `insertion`    | ➕   | Extra sound that shouldn't be there / 多余音素     |

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

| Tool                 | Local?          | Per-phoneme?         | Playback?           | Free?           |
| :------------------- | :-------------- | :------------------- | :------------------ | :-------------- |
| **Pronuncy**         | ✅ 100% offline | ✅ IPA phoneme level | ✅ Your voice + TTS | ✅ Open source  |
| ELSA Speak           | ❌ Cloud only   | ✅                   | ❌ Limited          | ❌ Subscription |
| Speechling           | ❌ Cloud only   | ❌ Word level only   | ❌                  | ⚠️ Freemium     |
| Google Pronunciation | ❌ Cloud only   | ❌ Black-box score   | ❌                  | ✅              |
| Praat (academic)     | ✅ Local        | ⚠️ Manual analysis   | ✅                  | ✅              |

Pronuncy sits in a sweet spot: **academic-grade analysis** (IPA phonemes + forced alignment) with a **consumer-friendly UI** (record a sentence, get instant color-coded feedback). / Pronuncy 找到了学术与易用的平衡点：**学术级的 IPA 音素分析** + 精准对齐，搭配 **消费级 UI**（录一句话，秒出彩色反馈）。

---

## 📁 Project Structure / 项目结构

```
pronuncy/
├── README.md                         # You are here
├── Makefile                          # One-command dev / test / build
├── assets/                           # Logo
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
    │   ├── types/                    # Shared TS interfaces
    │   ├── utils/                    # Pure utility functions
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

Backend on `:8000`, frontend on `:3000`. Model cache volumes are mounted so you don't re-download on rebuild. / 后端运行在 `:8000`，前端在 `:3000`。模型缓存挂载为 volume，重建容器无需重新下载。

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

- **Phoneme detection via transcription** — Pronuncy detects mispronunciations by comparing what Whisper _heard_ (as text) against what you _meant_ to say. If you mispronounce "world" slightly but Whisper still hears "world", the phoneme-level score stays high. Gross mispronunciations (where Whisper transcribes a different word) are reliably caught. / Pronuncy 通过比对 Whisper 听到的文字与目标文字来检测发音问题。如果轻微读错但 Whisper 仍识别正确，音素评分会偏高；明显读错（Whisper 识别为不同单词）则会被准确捕获。
- **First-run download** — ~1.9GB of models are downloaded on first use. A fast internet connection is recommended. / 首次运行需下载约 1.9GB 模型文件，建议用快速网络。
- **English only** — The pipeline is tuned for English. Other languages are not supported yet. / 目前仅支持英语，其他语言尚未适配。

---

## 🗺 Roadmap / 路线图

### ✅ v0.1 — Hello World（已完成）

Basic recording → Allosaurus phoneme recognition → Levenshtein alignment → score + playback. / 基础录音 → 音素识别 → 对齐评分 → 回放。

### ✅ v0.2 — Accurate Alignment（已完成）

Replaced Allosaurus with **WhisperX** (faster-whisper + wav2vec2 forced alignment). Transcription accuracy jumped from ~70% to ~95%. Word-level and phoneme-level timestamps are now frame-accurate. / 将 Allosaurus 替换为 **WhisperX**（faster-whisper + wav2vec2 强制对齐），识别准确率从 ~70% 提升至 ~95%，单词和音素级别的时间戳达到帧级精度。

### ✅ v0.3 — Acoustic Layer（已完成）

- **Acoustic Quality Score** — F1/F2 formants for vowels, spectral centroid for fricatives, F0 + duration + energy. Compared against Peterson & Barney native speaker reference values. / 声学质量评分：元音 F1/F2 共振峰、擦音频谱质心、基频 F0 + 时长 + 能量，与 Peterson & Barney 母语者参考值对比。
- **Accent Knowledge Base** — Rule-based matching of L1→English transfer patterns. First profile: `zh-CN` (12 common Chinese→English patterns with bilingual tips). / 口音知识库：基于规则的 L1→英语迁移模式匹配，首个配置 `zh-CN`（12 种中文→英语常见迁移模式，含中英双语建议）。

### 🚧 v0.4 — Smart Feedback（下一步）

| Feature / 功能                      | Description / 说明                                                                                                                                                                                                                                                                                                                             |
| :---------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 🤖 **Local LLM / 本地大模型**       | Ollama (llama3.2 3B or qwen2.5 7B) to generate personalized paragraph feedback — not just "your /θ/ needs work" but "as a Mandarin speaker, you're substituting /θ/ with /s/ — try this tongue drill..." / 使用本地大模型生成个性化段落反馈，不只是「/θ/ 需要练习」，而是「作为中文母语者，你在用 /s/ 替代 /θ/ — 试试把舌尖放在上下齿之间...」 |
| 📊 **Progress Tracking / 进度追踪** | SQLite user profile with per-phoneme history over time. Track which sounds are improving and which are stuck. / SQLite 用户档案，记录每个音素的历史变化，追踪哪些音在进步、哪些停滞。                                                                                                                                                          |
| 👤 **Multi-user Support / 多用户**  | Profile switching, per-user history and accent settings. / 用户切换，每人独立的历史记录和口音设置。                                                                                                                                                                                                                                            |

### 🔮 v0.5 — Smart Scoring（远期规划）

| Feature / 功能                             | Description / 说明                                                                                                                                                                                                           |
| :----------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 🧠 **Fine-tuned Classifier / 微调分类器**  | After collecting user data, fine-tune a small phoneme classifier (wav2vec2 → linear head) on real L2 pronunciation data for more nuanced scoring. / 积累用户数据后，用真实 L2 发音数据微调小型音素分类器，实现更细腻的评分。 |
| 🌏 **More Accent Profiles / 更多口音配置** | `ja-JP`, `ko-KR`, `hi-IN`, `es-ES` profiles with language-specific transfer patterns. / 日语、韩语、印地语、西班牙语等母语配置，含各语言特有的迁移模式。                                                                     |
| 🎮 **Practice Mode / 练习模式**            | Gamified phoneme drills based on your weak spots — spaced repetition for pronunciation. / 基于薄弱音素的游戏化练习，结合间隔重复提升发音。                                                                                   |

---

<p align="center">
  <sub>Built with ❤️ for English learners everywhere. / 献给每一位英语学习者。</sub>
</p>
