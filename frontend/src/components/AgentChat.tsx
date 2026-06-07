import { useCallback, useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { useI18n } from '../i18n/I18nContext'
import type { AssessmentResult, ChatMessage, UserConfig } from '../services/api'
import { sendChatMessage } from '../services/agent'
import ChatBubble from './ChatBubble'
import ChatInput from './ChatInput'
import ThinkingDots from './ThinkingDots'

interface Props {
  sessionId: string
  config: UserConfig
}

function genId() { return crypto.randomUUID() }

export default function AgentChat({ sessionId, config }: Props) {
  const { t } = useI18n()
  const hasApiKey = config.apiKey.length > 0
  const welcomeMsg = hasApiKey ? t('agentWelcome') : t('agentWelcomeNoApi')

  const [messages, setMessages] = useState<ChatMessage[]>(() => [{
    id: genId(),
    role: 'agent',
    content: welcomeMsg,
    timestamp: Date.now(),
  }])
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const streamingRef = useRef('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    if (bottomRef.current) {
      gsap.to(scrollRef.current, {
        scrollTop: scrollRef.current?.scrollHeight || 0,
        duration: 0.3,
        ease: 'power2.out',
      })
    }
  }, [messages, streamingText])

  const addMessage = useCallback((role: 'user' | 'agent', content: string, assessmentResult?: AssessmentResult) => {
    const msg: ChatMessage = {
      id: genId(),
      role,
      content,
      timestamp: Date.now(),
      assessmentResult,
    }
    setMessages((prev) => [...prev, msg])
    return msg
  }, [])

  const handleSend = useCallback(async (text: string) => {
    if (isStreaming || !text.trim()) return
    if (!hasApiKey) {
      // No API: show user text and auto-generate a practice prompt
      addMessage('user', text)
      setTimeout(() => addMessage('agent', `/practice: ${text}`), 300)
      return
    }

    setIsStreaming(true)
    setStreamingText('')
    streamingRef.current = ''

    addMessage('user', text)

    try {
      const { events } = sendChatMessage(text, sessionId, config)

      for await (const ev of events) {
        if (ev.event === 'text') {
          const chunk = ev.data.text as string || ''
          streamingRef.current += chunk
          setStreamingText((prev) => prev + chunk)
        } else if (ev.event === 'thinking') {
          // thinking indicator is handled by ThinkingDots
        } else if (ev.event === 'done') {
          if (ev.data.error) {
            addMessage('agent', `Error: ${ev.data.error}`)
          }
        }
      }

      const finalText = streamingRef.current
      setStreamingText('')
      streamingRef.current = ''
      if (finalText) {
        addMessage('agent', finalText)
      }
    } catch (e: any) {
      addMessage('agent', `Sorry, something went wrong: ${e.message}`)
    } finally {
      setIsStreaming(false)
    }
  }, [isStreaming, hasApiKey, sessionId, config, addMessage])

  // When practice result comes in from ChatBubble, send it as context to agent
  const handlePracticeResult = useCallback(async (result: AssessmentResult, sentence: string) => {
    if (!hasApiKey) return
    // Send the result as context for agent to give feedback
    const contextMsg = `/assess_result: ${JSON.stringify({
      assessment_id: result.assessment_id,
      target_text: result.target_text,
      recognized_text: result.recognized_text,
      overall_score: result.overall_score,
      acoustic_score: result.acoustic_score,
      alignment_summary: result.alignment
        .filter(a => a.status !== 'correct')
        .map(a => `${a.expected}→${a.recognized}(${a.status})`)
        .join(', '),
      accent_tips: result.accent_tips?.map(t => t.tip).join('; '),
    })}`

    setIsStreaming(true)
    setStreamingText('')
    streamingRef.current = ''

    try {
      const { events } = sendChatMessage(contextMsg, sessionId, config)

      for await (const ev of events) {
        if (ev.event === 'text') {
          const chunk = ev.data.text as string || ''
          streamingRef.current += chunk
          setStreamingText((prev) => prev + chunk)
        } else if (ev.event === 'done') {
          if (ev.data.error) {
            addMessage('agent', `Feedback error: ${ev.data.error}`)
          }
        }
      }

      const finalText = streamingRef.current
      setStreamingText('')
      streamingRef.current = ''
      if (finalText) {
        addMessage('agent', finalText)
      }
    } catch {
      // Silent fail
    } finally {
      setIsStreaming(false)
    }
  }, [hasApiKey, sessionId, config, addMessage])

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-1 py-4 space-y-1 scroll-smooth">
        {messages.map((msg) => (
          <ChatBubble
            key={msg.id}
            message={msg}
            sessionId={sessionId}
            config={config}
            onPracticeResult={handlePracticeResult}
          />
        ))}

        {/* Streaming text bubble */}
        {isStreaming && (
          <div className="flex items-start gap-2 mb-4">
            <div className="w-7 h-7 rounded-full bg-amber/20 flex items-center justify-center flex-shrink-0 mt-1">
              <span className="text-xs">🎙️</span>
            </div>
            <div className="max-w-[85%] px-4 py-3 rounded-2xl rounded-bl-md bg-cream-warm text-ink border border-cream-dark/50 text-sm font-sans leading-relaxed">
              {streamingText ? (
                <p className="whitespace-pre-wrap">
                  {streamingText}
                  <span className="inline-block w-1.5 h-4 bg-amber/60 animate-pulse rounded-sm ml-0.5 align-middle" />
                </p>
              ) : (
                <ThinkingDots />
              )}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="flex-shrink-0 pt-2">
        <ChatInput
          onSend={handleSend}
          disabled={isStreaming}
          placeholder={hasApiKey ? undefined : t('practiceSentence')}
        />
      </div>
    </div>
  )
}
