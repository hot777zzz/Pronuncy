import type { StreamEvent, UserConfig } from './api'

const API_BASE = 'http://localhost:8000'

export interface AgentStreamResult {
  events: AsyncGenerator<StreamEvent, void, unknown>
  controller: AbortController
}

function parseSSEStream(resp: Response, signal?: AbortSignal): AgentStreamResult {
  const controller = new AbortController()

  async function* eventGenerator(): AsyncGenerator<StreamEvent, void, unknown> {
    const reader = resp.body?.getReader()
    if (!reader) {
      yield { event: 'done', data: { error: 'No response body' } }
      return
    }

    const decoder = new TextDecoder()
    let buffer = ''

    const onAbort = () => reader.cancel()
    signal?.addEventListener('abort', onAbort)
    controller.signal.addEventListener('abort', onAbort)

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        let currentEvent = ''
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim()
          } else if (line.startsWith('data: ')) {
            const dataStr = line.slice(6)
            try {
              const data = JSON.parse(dataStr)
              yield { event: currentEvent as StreamEvent['event'], data }
            } catch {
              // skip malformed JSON lines
            }
          }
        }
      }
    } finally {
      signal?.removeEventListener('abort', onAbort)
      try { reader.releaseLock() } catch {}
    }
  }

  return { events: eventGenerator(), controller }
}

export function getAgentFeedbackStream(
  assessmentId: string,
  config: UserConfig,
  force: boolean = false,
): AgentStreamResult {
  const controller = new AbortController()

  async function* eventGenerator(): AsyncGenerator<StreamEvent, void, unknown> {
    const resp = await fetch(`${API_BASE}/agent/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assessment_id: assessmentId,
        force,
        api_key: config.apiKey,
        base_url: config.baseUrl,
        model: config.model,
      }),
      signal: controller.signal,
    })

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: `Server error: ${resp.status}` }))
      yield { event: 'done', data: { error: (err as Record<string, unknown>).error || `HTTP ${resp.status}` } }
      return
    }

    const result = parseSSEStream(resp, controller.signal)
    for await (const event of result.events) {
      yield event
    }
  }

  return { events: eventGenerator(), controller }
}

export function sendChatMessage(
  message: string,
  sessionId: string,
  config: UserConfig,
): AgentStreamResult {
  const controller = new AbortController()

  async function* eventGenerator(): AsyncGenerator<StreamEvent, void, unknown> {
    const resp = await fetch(`${API_BASE}/agent/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        session_id: sessionId,
        api_key: config.apiKey,
        base_url: config.baseUrl,
        model: config.model,
      }),
      signal: controller.signal,
    })

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: `Server error: ${resp.status}` }))
      yield { event: 'done', data: { error: (err as Record<string, unknown>).error || `HTTP ${resp.status}` } }
      return
    }

    const result = parseSSEStream(resp, controller.signal)
    for await (const event of result.events) {
      yield event
    }
  }

  return { events: eventGenerator(), controller }
}
