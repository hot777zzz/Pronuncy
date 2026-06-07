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
│   ├── main.py                 # FastAPI 应用工厂 + lifespan (DB 初始化)
│   ├── config.py               # pydantic-settings 配置
│   ├── model_setup.py          # 首次运行 Whisper 模型选择器
│   ├── api/
│   │   ├── __init__.py
│   │   ├── router.py           # 顶层路由聚合
│   │   └── endpoints/
│   │       ├── health.py       # GET /health
│   │       ├── assess.py       # POST /assess
│   │       ├── audio.py        # GET /audio/{filename}
│   │       ├── models.py       # GET /model
│   │       ├── history.py      # GET /history, /history/{id}, /history/progress
│   │       └── agent.py        # POST /agent/chat, POST /agent/feedback
│   ├── agent/                   # AI 教练模块 (v0.4)
│   │   ├── gateway.py          # SSE 编排 + 工具执行循环
│   │   ├── prompts.py          # 双语系统提示词 (CHAT + FEEDBACK)
│   │   ├── tools.py            # Agent 工具 (3 工具: 音素历史, 错误模式, 进度对比)
│   │   ├── cache.py            # 反馈缓存包装器
│   │   └── providers/          # LLM Provider 抽象层
│   │       ├── base.py         # 抽象 AgentProvider + AgentEvent
│   │       ├── openai.py       # OpenAI 兼容 SSE 流式 Provider
│   │       └── __init__.py     # Provider 工厂函数
│   ├── db/                     # SQLite 存储层 (v0.4)
│   │   ├── schema.sql          # DDL (4 张表 + 索引)
│   │   ├── connection.py       # 连接管理器 (WAL 模式, 线程安全)
│   │   └── queries.py          # CRUD + 聚合查询 (12 个函数)
│   ├── core/
│   │   ├── exceptions.py       # 自定义异常类 (含 NotFoundError)
│   │   ├── handlers.py         # 全局异常 → JSON 响应 (含 404)
│   │   └── logging.py          # structlog 结构化日志
│   ├── schemas/
│   │   ├── assess.py           # 评估请求/响应模型
│   │   ├── agent.py            # Agent 对话/反馈请求模型
│   │   └── history.py          # 历史/进度响应模型
│   └── services/
│       ├── phoneme_pipeline.py # 核心: WhisperX → g2p-en → 对齐
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
| 语音识别 | WhisperX medium.en | Whisper 转录，输出词级时间戳 |
| 强制对齐 | wav2vec2 fairseq base 960h | 将文本精确对齐到音频帧 |
| 语音活动检测 | Pyannote VAD | 过滤静音，只处理有效语音段 |
| 文本转音素 | g2p-en 2.1 | CMUdict 字典，输出 ARPAbet |
| 序列对齐 | 编辑距离 (Levenshtein) | 自定义 DP 实现，音素级对比 |
| 音频转换 | ffmpeg | WebM/MP4 → WAV (16kHz/mono/16bit) |
| 数据存储 | SQLite (WAL) | 评估记录、音素历史、Agent 反馈缓存 |
| AI Agent | OpenAI-compatible API | 流式 SSE 对话 + 工具调用 (3 tools) |
| Agent 工具 | Python async | query_phoneme_history, analyze_error_patterns, compare_progress |

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

# 3. 启动开发服务器（首次运行会自动下载模型约 1.9GB）
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 4. 访问 API 文档
open http://localhost:8000/docs
```

首次运行时会自动下载以下模型（取决于选择的 Whisper 模型）：
- WhisperX（tiny.en ~75MB / base.en ~150MB / small.en ~500MB / medium.en ~1.5GB）→ `~/.cache/huggingface/hub/`
- wav2vec2 fairseq 对齐模型 (~360MB) → `~/.cache/torch/hub/checkpoints/`
- Pyannote VAD 模型 (~50MB) → `~/.cache/torch/hub/checkpoints/`

## 配置

通过环境变量或 `.env` 文件配置：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `HOST` | `0.0.0.0` | 监听地址 |
| `PORT` | `8000` | 监听端口 |
| `LOG_LEVEL` | `info` | 日志级别 (debug/info/warning/error) |
| `WHISPER_MODEL` | `medium.en` | Whisper 模型: `tiny.en` / `base.en` / `small.en` / `medium.en` |
| `DB_PATH` | `data/pronuncy.db` | SQLite 数据库文件路径 |
| `AGENT_PROVIDER` | `openai` | AI Agent Provider (openai-compatible) |
| `AGENT_API_KEY` | — | Agent API 密钥 (OpenAI / DeepSeek / Qwen 等) |
| `AGENT_MODEL` | `gpt-4o` | Agent 使用的模型名称 |
| `AGENT_BASE_URL` | `https://api.openai.com/v1` | Agent API 接口地址 |

### 首次运行与模型选择

首次启动时无需手动创建 `.env`，程序会在终端弹出交互式菜单：

```
==============================================================
  Pronuncy — First-time Setup / 首次运行设置
==============================================================

  Select Whisper model for speech recognition:
  请选择语音识别模型：

  1. tiny.en     ~75MB    [需下载 needs download]
     Fastest, minimal accent detection / 最快，口音检测能力弱

  2. base.en     ~150MB   [已安装 installed]
     Fast, basic accent detection / 快速，基础口音检测

  3. small.en    ~500MB   [需下载 needs download]
     Balanced speed/quality, good accent detection

  4. medium.en   ~1.5GB   [需下载 needs download]
     Best accuracy & accent detection. ★ 推荐 recommended

  Choose / 选择 (1-4) [default=4=medium.en]:
```

已下载的模型标注 `[已安装 installed]` 可立即使用；未下载的模型会在首次使用时自动下载。

选择结果写入 `backend/.env`，之后可通过编辑该文件或环境变量切换模型。

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
| 404 | 资源未找到（评估记录不存在） |
| 422 | 音频解码失败（格式损坏、转码失败） |
| 500 | 模型推理失败或内部错误 |

### `GET /model`

返回当前 Whisper 模型及可用选项。

```
GET /model → 200 {
  "current": "medium.en",
  "available": [
    { "id": "tiny.en", "size": "~75MB", "accuracy": "Basic", ... },
    ...
  ]
}
```

### `GET /history`

按 session 列出最近评估记录。

| 参数 | 类型 | 说明 |
|------|------|------|
| `session_id` | string (必填) | 客户端 Session ID |
| `limit` | int (默认 20) | 返回条数 (1–100) |
| `offset` | int (默认 0) | 分页偏移 |

```
GET /history?session_id=abc → 200 {
  "items": [{ "id": "...", "target_text": "hello", "overall_score": 85.0, ... }],
  "total": 1
}
```

### `GET /history/{assessment_id}`

返回单次评估的完整详情（包含 alignment、word_groups、accent_tips 等）。

### `GET /history/progress`

返回逐音素的学习进度统计数据。

| 参数 | 类型 | 说明 |
|------|------|------|
| `session_id` | string (必填) | 客户端 Session ID |
| `phoneme` | string (可选) | 筛选特定音素 (IPA) |

```
GET /history/progress?session_id=abc → 200 {
  "phonemes": [
    {
      "phoneme": "θ",
      "total_attempts": 12,
      "correct_count": 4,
      "average_acoustic": 0.62,
      "average_overall": 72.5,
      "last_practiced": "2026-06-07T...",
      "recent_history": [...]
    }
  ]
}
```

### `POST /agent/chat`

自由对话式 AI 教练（SSE 流式响应）。Agent 会主动用 `/practice:` 格式邀请用户练习。

**请求格式:** `application/json`

| 字段 | 类型 | 说明 |
|------|------|------|
| `message` | string (必填) | 用户消息文本 |
| `session_id` | string | Session ID |
| `api_key` | string (必填) | API Key |
| `base_url` | string (必填) | API 地址 |
| `model` | string (必填) | 模型名称 |

**响应:** `text/event-stream` (SSE)

SSE 事件类型:
| event | data | 说明 |
|-------|------|------|
| `thinking` | `{ "text": "..." }` | Agent 思考过程 |
| `text` | `{ "text": "...", "section": null }` | 对话文本流 |
| `done` | `{}` | 流结束 |

### `POST /agent/feedback`

针对已完成评估的 AI 分析（SSE 流式响应）。Agent 调用工具查询历史和模式，输出结构化反馈。

**请求格式:** `application/json`

| 字段 | 类型 | 说明 |
|------|------|------|
| `assessment_id` | string (必填) | 评估 ID |
| `force` | bool (默认 false) | 跳过缓存重新生成 |
| `api_key` | string | API Key（可选，默认用服务端配置） |
| `base_url` | string | API 地址 |
| `model` | string | 模型名称 |

**响应:** `text/event-stream` (SSE)

SSE 事件类型:
| event | data | 说明 |
|-------|------|------|
| `thinking` | `{ "text": "..." }` | 分析思考过程 |
| `tool_call` | `{ "id": "...", "name": "...", "arguments": {...} }` | 工具调用 |
| `tool_result` | `{ "tool": "...", "result": {...} }` | 工具返回 |
| `section` | `{ "section": "accent_tasks\|speaking_suggestions\|improvement_plan" }` | 反馈段落开始 |
| `text` | `{ "text": "...", "section": "..." }` | 段落内容流 |
| `done` | `{ "assessment_id": "...", "cached": bool }` | 流结束 |

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
声学分析 → 口音知识库 → 个性化建议               │
    │                                            │
    ▼                                            │
保存至 SQLite (assessments + alignment_items     │
    + phoneme_history)                           │
    │                                            │
    ▼                                            │
{ score, alignment[], acoustic[], tips[],        │
  assessment_id, session_id }                   ─┘



Agent 对话 (v0.4):

浏览器 POST /agent/chat  ──────────────────────┐
    │  { message, api_key, base_url, model }     │
    ▼                                            │
Agent Gateway (SSE streaming)                    │
    │                                            │
    ├─→ OpenAI-compatible API (stream)           │
    │     └─→ AgentEvent (thinking/text/done)    │
    │                                            │
    └─→ SSE response → 浏览器实时渲染            │



Agent 反馈 (v0.4):

浏览器 POST /agent/feedback  ───────────────────┐
    │  { assessment_id, ... }                    │
    ▼                                            │
Agent Gateway (SSE streaming + tool loop)        │
    │                                            │
    ├─→ SQLite: get_assessment()                 │
    ├─→ OpenAI API (stream with tools)           │
    │     ├─ tool_call → execute_tool()           │
    │     │   ├─ query_phoneme_history → SQLite   │
    │     │   ├─ analyze_error_patterns           │
    │     │   └─ compare_progress → SQLite        │
    │     └─ tool_result → back to LLM            │
    │                                            │
    ├─→ SQLite: cache_feedback()                 │
    └─→ SSE response → 浏览器渲染结构化反馈      │
```

### 依赖注入

`PhonemePipeline` 通过 FastAPI `Depends` 注入，每次请求创建新实例。模型在 `__init__` 中加载（WhisperX + wav2vec2 对齐模型）。SQLite 连接在应用启动时（lifespan）初始化一次，全局共享。

### Agent Provider 抽象

`app/agent/providers/` 定义了 `AgentProvider` 抽象基类，支持任意 OpenAI-compatible API。通过 `.env` 配置 `AGENT_PROVIDER` / `AGENT_BASE_URL` 切换后端（OpenAI / DeepSeek / Qwen / 本地 Ollama 等）。

### 异常处理

自定义异常统一继承 `PronuncyError`，全局 handler 根据异常类型返回对应状态码和 JSON 错误信息：
- `ValidationError` → 400
- `NotFoundError` → 404
- `AudioDecodeError` → 422
- 其他 `PronuncyError` → 500
- 未捕获异常 → 500

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

- WhisperX medium.en 对口音语音鲁棒性更强，转录准确率更高，可检测明显误读（识别出错误单词），但单词内部的细微发音偏差检测仍有限
- wav2vec2 强制对齐提供精确词边界，音素内时间戳为按比例估算
- 不支持实时流式识别，需完整录音后评估
- 仅支持英语
- 模型总大小约 1.9GB，首次下载需良好网络连接
