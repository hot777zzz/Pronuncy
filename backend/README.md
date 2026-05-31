# Pronuncy Backend

本地英语发音评估后端服务。基于 FastAPI + WhisperX + g2p-en，在 CPU 上运行，无需 GPU。

## 目录结构

```
backend/
├── pyproject.toml              # 项目配置 (PEP 621)
├── .env.example                # 环境变量模板
├── .pre-commit-config.yaml     # Git pre-commit hooks
├── Dockerfile                  # 生产镜像
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI 应用工厂 + lifespan
│   ├── config.py               # pydantic-settings 配置
│   ├── api/
│   │   ├── __init__.py
│   │   ├── router.py           # 顶层路由聚合
│   │   └── endpoints/
│   │       ├── health.py       # GET /health
│   │       ├── assess.py       # POST /assess
│   │       └── audio.py        # GET /audio/{filename}
│   ├── core/
│   │   ├── exceptions.py       # 自定义异常类
│   │   ├── handlers.py         # 全局异常 → JSON 响应
│   │   └── logging.py          # structlog 结构化日志
│   ├── schemas/
│   │   └── assess.py           # Pydantic 请求/响应模型
│   └── services/
│       ├── phoneme_pipeline.py # 音素识别与评分核心逻辑
│       └── phoneme_map.py      # ARPAbet ↔ IPA 映射表
└── tests/
    ├── conftest.py             # TestClient + sample_wav fixture
    ├── test_health.py
    └── test_assess.py
```

## 技术栈

| 组件 | 技术 | 说明 |
|------|------|------|
| Web 框架 | FastAPI 0.100+ | 异步 HTTP，自动 OpenAPI 文档 |
| ASGI 服务器 | Uvicorn | 支持热重载开发 |
| 配置管理 | pydantic-settings | 环境变量 + .env 文件 |
| 日志 | structlog | 结构化日志，控制台彩色输出 |
| 语音识别 | WhisperX base.en | Whisper 转录，输出词级时间戳 |
| 强制对齐 | wav2vec2 fairseq base 960h | 将文本精确对齐到音频帧 |
| 语音活动检测 | Pyannote VAD | 过滤静音，只处理有效语音段 |
| 文本转音素 | g2p-en 2.1 | CMUdict 字典，输出 ARPAbet |
| 序列对齐 | 编辑距离 (Levenshtein) | 自定义 DP 实现，音素级对比 |
| 音频转换 | ffmpeg | WebM/MP4 → WAV (16kHz/mono/16bit) |

## 快速开始

### 环境要求

- **Python 3.11+**（必须，依赖库使用了 `str | None` 语法）
- **ffmpeg**（音频格式转换）

macOS 安装 ffmpeg:
```bash
brew install ffmpeg
```

### 安装与运行

```bash
# 1. 同步依赖
uv sync

# 2. 安装开发依赖（可选）
uv sync --extra dev

# 3. 启动开发服务器（首次运行会自动下载模型约 560MB）
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 4. 访问 API 文档
open http://localhost:8000/docs
```

首次运行时会自动下载以下模型：
- WhisperX base.en (~150MB) → `~/.cache/huggingface/hub/`
- wav2vec2 fairseq 对齐模型 (~360MB) → `~/.cache/torch/hub/checkpoints/`
- Pyannote VAD 模型 (~50MB) → `~/.cache/torch/hub/checkpoints/`

## 配置

通过环境变量或 `.env` 文件配置：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `HOST` | `0.0.0.0` | 监听地址 |
| `PORT` | `8000` | 监听端口 |
| `LOG_LEVEL` | `info` | 日志级别 (debug/info/warning/error) |

## API

### `GET /health`

健康检查。

```
GET /health → 200 { "status": "ok" }
```

### `POST /assess`

提交音频和目标文本，返回逐音素评估结果。

**请求格式:** `multipart/form-data`

| 字段 | 类型 | 说明 |
|------|------|------|
| `audio` | file | 音频文件（WAV/WebM/MP4），服务端会自动转码 |
| `target_text` | string | 目标句子文本 |

**响应示例:**

```json
{
  "overall_score": 85.0,
  "alignment": [
    { "expected": "h", "recognized": "h", "status": "correct", "start_ms": 94, "end_ms": 153 },
    { "expected": "ʌ", "recognized": "a", "status": "substitution", "start_ms": 153, "end_ms": 212 },
    { "expected": "l", "recognized": null, "status": "deletion", "start_ms": null, "end_ms": null },
    { "expected": null, "recognized": "ə", "status": "insertion", "start_ms": 212, "end_ms": 250 }
  ],
  "expected_phones": ["h", "ʌ", "l", "oʊ"],
  "recognized_phones": ["h", "a", "oʊ", "ə"],
  "target_text": "hello",
  "recognized_text": "hallo",
  "word_groups": [
    { "word": "hello", "phoneme_start": 0, "phoneme_end": 4, "score": 50.0 }
  ],
  "trimmed_audio_url": "/audio/abc123.wav"
}
```

**状态说明:**

| status | 含义 |
|--------|------|
| `correct` | 音素发音正确 |
| `substitution` | 音素被替换为其他音素 |
| `deletion` | 遗漏了音素 |
| `insertion` | 多出了音素 |

**错误码:**

| 状态码 | 说明 |
|--------|------|
| 400 | 参数校验失败（空文本、音频太小） |
| 422 | 音频解码失败（格式损坏、转码失败） |
| 500 | 模型推理失败或内部错误 |

## 开发指南

### 代码质量

```bash
# 代码检查（lint）
ruff check app/ tests/

# 自动修复
ruff check app/ tests/ --fix

# 格式化
ruff format app/ tests/

# 类型检查
mypy app/
```

### 测试

```bash
# 运行所有测试
uv run pytest

# 详细输出
uv run pytest -v

# 单文件
uv run pytest tests/test_assess.py -v
```

测试使用 FastAPI `TestClient`，无需启动服务器。`test_assess.py` 中的管线测试使用了 mock，避免实际加载模型。

### Pre-commit Hooks

```bash
pre-commit install
```

提交前自动运行 ruff 和 mypy。

## 架构说明

### 数据流

```
浏览器录音 (WebM/MP4)
    │
    ▼
POST /assess  ──────────────────────────────────┐
    │                                            │
    ▼                                            │
音频字节 → ffmpeg 转 WAV (16kHz/mono, 去静音)   │
    │                                            │
    ▼                                            │
WhisperX 转录 → wav2vec2 强制对齐               │  PhonemePipeline
    │                                            │
    ▼                                            │
对齐后的词 → g2p-en 转 IPA 音素 + 时间戳        │
    │                                            │
    ▼                                            │
g2p-en → ARPAbet → IPA (目标音素序列)            │
    │                                            │
    ▼                                            │
编辑距离对齐 → 逐音素对比                         │
    │                                            │
    ▼                                            │
{ score, alignment, recognized_text, ... }      ─┘
```

### 依赖注入

`PhonemePipeline` 通过 FastAPI `Depends` 注入，每次请求创建新实例。模型在 `__init__` 中加载（WhisperX + wav2vec2 对齐模型），实际生产中可改用应用级单例减少加载开销。

### 异常处理

自定义异常统一继承 `PronuncyError`，全局 handler 根据异常类型返回对应状态码和 JSON 错误信息。未捕获异常统一返回 500。

### 音素映射

`phoneme_map.py` 维护 39 个 ARPAbet 到 IPA 的映射。目标文本和识别文本均通过相同 g2p-en 管道转换，音素直接可比。

## Docker

```bash
# 构建镜像
docker build -t pronuncy-backend .

# 运行
docker run -p 8000:8000 pronuncy-backend
```

镜像基于 `python:3.11-slim`，包含 ffmpeg。模型文件在首次请求时下载，可通过挂载 volume 缓存：

```bash
docker run -p 8000:8000 \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  -v ~/.cache/torch:/root/.cache/torch \
  pronuncy-backend
```

## 局限

- WhisperX base.en 转录准确率约 95%，可检测明显误读（识别出错误单词），但无法检测单词内部的细微发音偏差
- wav2vec2 强制对齐提供精确词边界，音素内时间戳为按比例估算
- 不支持实时流式识别，需完整录音后评估
- 仅支持英语
- 模型总大小约 560MB，首次下载需良好网络连接
