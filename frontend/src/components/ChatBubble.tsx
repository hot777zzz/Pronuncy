import { useEffect, useMemo, useRef, useState } from 'react'
import gsap from 'gsap'
import type { ChatMessage, AssessmentResult, UserConfig } from '../services/api'
import PracticePrompt from './PracticePrompt'

interface Props {
  message: ChatMessage
  sessionId: string
  config: UserConfig
  onPracticeResult: (result: AssessmentResult, sentence: string) => void
}

interface ContentSegment {
  type: 'text' | 'practice'
  text?: string
  sentence?: string
}

function parseContent(content: string): ContentSegment[] {
  if (!content) return []
  const segments: ContentSegment[] = []
  const regex = /\/practice:\s*(.+?)(?=\n|$)/g
  let lastIdx = 0
  let match

  while ((match = regex.exec(content)) !== null) {
    // Text before this match
    if (match.index > lastIdx) {
      const text = content.slice(lastIdx, match.index).trim()
      if (text) segments.push({ type: 'text', text })
    }
    // Practice sentence
    const sentence = match[1].trim()
    if (sentence) segments.push({ type: 'practice', sentence })
    lastIdx = match.index + match[0].length
  }

  // Remaining text
  if (lastIdx < content.length) {
    const text = content.slice(lastIdx).trim()
    if (text) segments.push({ type: 'text', text })
  }

  // If no /practice: found, return whole content as text
  if (segments.length === 0 && content.trim()) {
    return [{ type: 'text', text: content.trim() }]
  }

  return segments
}

export default function ChatBubble({ message, sessionId, config, onPracticeResult }: Props) {
  const bubbleRef = useRef<HTMLDivElement>(null)
  const isUser = message.role === 'user'

  const segments = useMemo(() => parseContent(message.content), [message.content])

  useEffect(() => {
    if (!bubbleRef.current) return
    gsap.fromTo(bubbleRef.current,
      { opacity: 0, y: 16, scale: 0.97 },
      { opacity: 1, y: 0, scale: 1, duration: 0.35, ease: 'power2.out' },
    )
  }, [])

  const renderMarkdown = (text: string) => {
    if (!text) return null
    const lines = text.split('\n')
    return lines.map((line, i) => {
      let rendered = line.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
      rendered = rendered.replace(/\/([^/]+)\//g, '<code class="font-mono text-xs bg-cream-warm px-1 rounded">/$1/</code>')
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        return <div key={i} className="flex gap-2 ml-1" dangerouslySetInnerHTML={{ __html: `• ${rendered.replace(/^[-*]\s*/, '')}` }} />
      }
      if (!line.trim()) return <div key={i} className="h-1.5" />
      return <p key={i} className="whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: rendered }} />
    })
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      {/* Agent avatar */}
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-amber/20 flex items-center justify-center flex-shrink-0 mr-2 mt-1">
          <span className="text-xs">🎙️</span>
        </div>
      )}

      <div
        ref={bubbleRef}
        className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm font-sans leading-relaxed ${
          isUser
            ? 'bg-ink text-white rounded-br-md'
            : 'bg-cream-warm text-ink border border-cream-dark/50 rounded-bl-md'
        }`}
      >
        {segments.map((seg, idx) => {
          if (seg.type === 'practice' && seg.sentence) {
            return (
              <PracticePrompt
                key={idx}
                sentence={seg.sentence}
                sessionId={sessionId}
                config={config}
                onResult={(result) => onPracticeResult(result, seg.sentence!)}
              />
            )
          }
          return <div key={idx}>{renderMarkdown(seg.text || '')}</div>
        })}

        {/* Embedded assessment result (for user's practice messages) */}
        {message.assessmentResult && (
          <div className="mt-3 pt-3 border-t border-ink/10">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] font-sans font-semibold uppercase tracking-widest text-ink-muted">
                Practice Result
              </span>
              <span className={`text-sm font-mono font-bold ${
                message.assessmentResult.overall_score >= 80 ? 'text-emerald' :
                message.assessmentResult.overall_score >= 50 ? 'text-terracotta' : 'text-rose'
              }`}>
                {message.assessmentResult.overall_score}%
              </span>
            </div>
            <p className="text-xs text-ink-muted">{message.assessmentResult.target_text}</p>
          </div>
        )}
      </div>

      {/* User avatar */}
      {isUser && (
        <div className="w-7 h-7 rounded-full bg-ink/10 flex items-center justify-center flex-shrink-0 ml-2 mt-1">
          <span className="text-xs">👤</span>
        </div>
      )}
    </div>
  )
}
