# Pronuncy

Local English pronunciation assessment tool. / 本地英语发音评估工具。

Record your voice and get per-phoneme feedback using WhisperX + g2p-en. / 录制你的声音，使用 WhisperX + g2p-en 获取音素级反馈。

## Prerequisites / 环境要求

- **Python 3.11+** / Python 3.11 及以上
- **ffmpeg** — for audio format conversion / 音频格式转换
- **Node.js 18+** — for frontend / 前端依赖
- **uv** — Python package manager (install: `pip install uv`) / Python 包管理器

```bash
# macOS — install prerequisites
brew install ffmpeg node uv

# Verify
python3 --version   # >= 3.11
ffmpeg -version
node --version      # >= 18
uv --version
```

## Quick Start / 快速开始

```bash
# 1. Clone repository / 克隆仓库
git clone https://github.com/hot777zzz/Pronuncy.git
cd pronuncy

# 2. Install backend dependencies / 安装后端依赖
cd backend && uv sync

# 3. Install frontend dependencies / 安装前端依赖
cd ../frontend && npm install

# 4. Start backend server / 启动后端 (first run downloads ~560MB of models / 首次运行下载约560MB模型)
cd ../backend && uv run uvicorn app.main:app --reload --port 8000

# 5. Start frontend dev server / 启动前端开发服务器 (in a new terminal / 新终端窗口)
cd frontend && npm run dev
```

Then open http://localhost:3000 in your browser. / 然后在浏览器打开 http://localhost:3000。

## Frontend Stack / 前端技术栈

React 18 + TypeScript + Vite 5. Component structure: / 组件结构:

```
frontend/src/
├── App.tsx                          # Main app / 主应用
├── components/
│   ├── TargetInput.tsx              # Target sentence input / 目标句子输入
│   ├── AudioRecorder.tsx            # Recording controls / 录音控制
│   ├── ResultsPanel.tsx             # Score + alignment display / 结果展示
│   └── StatusBar.tsx                # App title + language toggle / 标题 + 语言切换
├── hooks/
│   └── useAudioRecorder.ts          # Recording logic hook / 录音逻辑
├── i18n/
│   ├── I18nContext.tsx              # React context for EN/ZH switching / 中英文切换
│   └── translations.ts             # Translation dictionary / 翻译字典
└── services/
    ├── api.ts                       # Type definitions / 类型定义
    └── phonemeAudio.ts              # Audio playback helpers / 音频播放工具
```

## How It Works / 工作原理

1. Enter a target sentence / 输入目标句子
2. Record your voice reading it / 录制你的朗读
3. Server transcribes with WhisperX and force-aligns with wav2vec2 / 服务端用 WhisperX 转录并用 wav2vec2 强制对齐
4. See per-phoneme feedback with playback from your own voice / 查看逐音素反馈并回放你的发音片段

### Model Stack / 模型栈

| Component / 组件                    | Model / 模型                    | Size / 大小 |
| ----------------------------------- | ------------------------------- | ----------- |
| Speech recognition / 语音识别       | WhisperX base.en                | ~150MB      |
| Forced alignment / 强制对齐         | wav2vec2 fairseq base 960h      | ~360MB      |
| Voice activity detection / 语音检测 | Pyannote VAD                    | ~50MB       |
| Text → phonemes / 文本转音素        | g2p-en (CMUdict)                | ~5MB        |
| Alignment / 序列对齐                | Levenshtein                     | —           |

Total model weights / 模型总大小: **~560MB**. Runs entirely on CPU / 纯 CPU 运行，无需 GPU。

## API

`POST /assess` — Multipart form: `audio` (WAV/WebM/MP4) + `target_text` (string)

```json
{
  "overall_score": 85.0,
  "alignment": [
    { "expected": "h", "recognized": "h", "status": "correct", "start_ms": 94, "end_ms": 153 },
    { "expected": "ʌ", "recognized": "a", "status": "substitution", "start_ms": 153, "end_ms": 212 }
  ],
  "expected_phones": ["h", "ʌ", "l", "oʊ"],
  "recognized_phones": ["h", "a", "l", "oʊ"],
  "recognized_text": "hello",
  "target_text": "Hello",
  "word_groups": [
    { "word": "hello", "phoneme_start": 0, "phoneme_end": 4, "score": 75.0 }
  ],
  "trimmed_audio_url": "/audio/abc123.wav"
}
```

**Status legend / 状态说明:**

- `correct` — 发音正确
- `substitution` — 发音替换（音素不正确）
- `deletion` — 遗漏音素
- `insertion` — 多余音素

## Limitations / 局限

WhisperX base.en transcription accuracy is ~95%. The pipeline can detect when a word is misrecognized (implying significant mispronunciation), but cannot detect subtle within-word phoneme errors — if Whisper correctly identifies the word, all its phonemes are marked correct. / WhisperX base.en 转录准确率约 95%。当单词被误识别时能检测出明显发音偏差，但无法检测单词内部的细微音素错误——若 Whisper 正确识别了单词，则其所有音素均标记为正确。
