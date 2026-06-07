import { useCallback, useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n/I18nContext'
import { getAgentFeedbackStream } from '../services/agent'
import type { UserConfig } from '../services/api'
import AgentThinkingStream, { createInitialSteps, type ThinkingStep } from './AgentThinkingStream'

interface Props {
  assessmentId: string
  config: UserConfig
}

interface Section {
  id: string
  title: string
  desc: string
  icon: string
  content: string
}

function makeSections(): Section[] {
  return [
    { id: 'accent_tasks', title: '', desc: '', icon: '🎯', content: '' },
    { id: 'speaking_suggestions', title: '', desc: '', icon: '💬', content: '' },
    { id: 'improvement_plan', title: '', desc: '', icon: '📋', content: '' },
  ]
}

export default function AgentFeedbackPanel({ assessmentId, config }: Props) {
  const { t } = useI18n()
  const [status, setStatus] = useState<'idle' | 'streaming' | 'done' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [sections, setSections] = useState<Section[]>(makeSections)
  const [thinkingSteps, setThinkingSteps] = useState<ThinkingStep[]>(createInitialSteps)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    accent_tasks: true,
    speaking_suggestions: false,
    improvement_plan: false,
  })
  const doneRef = useRef(false)

  // Map section IDs to i18n
  const sectionMeta: Record<string, { title: string; desc: string }> = {
    accent_tasks: { title: t('accentTasks'), desc: t('accentTasksDesc') },
    speaking_suggestions: { title: t('speakingSuggestions'), desc: t('speakingSuggestionsDesc') },
    improvement_plan: { title: t('improvementPlan'), desc: t('improvementPlanDesc') },
  }

  const startStreaming = useCallback(async () => {
    if (doneRef.current) return
    setStatus('streaming')
    setError(null)
    setThinkingSteps((prev) => prev.map((s) => (s.id === 'analyze' ? { ...s, status: 'loading' } : s)))

    const { events } = getAgentFeedbackStream(assessmentId, config)

    try {
      for await (const ev of events) {
        switch (ev.event) {
          case 'thinking':
            // Mark analyze or patterns as active
            setThinkingSteps((prev) =>
              prev.map((s) =>
                s.id === 'analyze' && s.status === 'loading' ? { ...s, status: 'done' } :
                s.id === 'history' && s.status === 'pending' ? { ...s, status: 'loading' } :
                s,
              ),
            )
            break

          case 'tool_call': {
            const toolName = (ev.data.name as string) || ''
            const stepId = toolName === 'query_phoneme_history' ? 'history'
              : toolName === 'analyze_error_patterns' ? 'patterns'
              : toolName === 'compare_progress' ? 'history'
              : ''
            if (stepId) {
              setThinkingSteps((prev) =>
                prev.map((s) =>
                  s.id === stepId ? { ...s, status: 'loading', detail: toolName } : s,
                ),
              )
            }
            break
          }

          case 'tool_result': {
            const toolName = (ev.data.tool as string) || ''
            const stepId = toolName === 'query_phoneme_history' ? 'history'
              : toolName === 'analyze_error_patterns' ? 'patterns'
              : toolName === 'compare_progress' ? 'history'
              : ''
            if (stepId) {
              setThinkingSteps((prev) =>
                prev.map((s) =>
                  s.id === stepId ? { ...s, status: 'done' } : s,
                ),
              )
            }
            // Mark craft as loading after tools complete
            setThinkingSteps((prev) =>
              prev.map((s) =>
                s.id === 'craft' && s.status === 'pending' ? { ...s, status: 'loading' } : s,
              ),
            )
            break
          }

          case 'section': {
            const sectionId = ev.data.section as string
            // Mark patterns done, craft done when sections start arriving
            setThinkingSteps((prev) =>
              prev.map((s) =>
                s.status === 'loading' ? { ...s, status: 'done' } : s,
              ),
            )
            // Pre-populate section with content if provided
            if (ev.data.content) {
              setSections((prev) =>
                prev.map((s) =>
                  s.id === sectionId ? { ...s, content: (ev.data.content as string) || '' } : s,
                ),
              )
            }
            break
          }

          case 'text': {
            const sectionId = (ev.data.section as string) || ''
            const text = (ev.data.text as string) || ''
            if (sectionId) {
              setSections((prev) =>
                prev.map((s) =>
                  s.id === sectionId ? { ...s, content: s.content + text } : s,
                ),
              )
            }
            break
          }

          case 'done': {
            if (ev.data.error) {
              setError(ev.data.error as string)
              setStatus('error')
            } else {
              setStatus('done')
              setThinkingSteps((prev) => prev.map((s) => ({ ...s, status: 'done' })))
            }
            doneRef.current = true
            return
          }
        }
      }
    } catch (e: any) {
      if (e.name === 'AbortError') return
      setError(e.message || 'Stream failed')
      setStatus('error')
    }
  }, [assessmentId, config])

  // Auto-start streaming when assessmentId becomes available
  useEffect(() => {
    if (assessmentId && status === 'idle') {
      startStreaming()
    }
  }, [assessmentId, status, startStreaming])

  const toggleSection = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  // Simple markdown-ish rendering: handle **bold**, bullet lists, inline `/.../`
  const renderContent = (text: string) => {
    if (!text) return null
    const lines = text.split('\n')
    return lines.map((line, i) => {
      // Bold
      let rendered = line.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
      // IPA in slashes
      rendered = rendered.replace(/\/([^/]+)\//g, '<code class="font-mono text-xs bg-cream-warm px-1 rounded">/$1/</code>')
      // Bullet points
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        return (
          <div key={i} className="flex gap-2 ml-2" dangerouslySetInnerHTML={{ __html: `• ${rendered.replace(/^[-*]\s*/, '')}` }} />
        )
      }
      if (!line.trim()) return <div key={i} className="h-2" />
      return <p key={i} dangerouslySetInnerHTML={{ __html: rendered }} />
    })
  }

  if (status === 'idle') {
    return (
      <button
        onClick={startStreaming}
        className="w-full py-3 px-4 rounded-xl bg-amber/10 border border-amber/20 text-amber hover:bg-amber/15 transition-colors font-sans font-medium text-sm"
      >
        {t('getAiFeedback')}
      </button>
    )
  }

  return (
    <div className="mt-4 space-y-4 animate-fade-in">
      {/* Thinking stream */}
      {(status === 'streaming') && (
        <div className="card-surface p-4">
          <p className="text-sm font-sans font-medium text-ink mb-1">{t('aiThinking')}</p>
          <AgentThinkingStream steps={thinkingSteps} />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="px-4 py-3 bg-rose/10 text-rose border border-rose/20 text-sm rounded-xl font-sans">
          {error}
          <button onClick={startStreaming} className="ml-3 underline text-rose/80 hover:text-rose">
            {t('retryFeedback')}
          </button>
        </div>
      )}

      {/* Sections */}
      {sections.map((section) => {
        const meta = sectionMeta[section.id]
        const isExpanded = expanded[section.id]
        const hasContent = section.content.length > 0

        if (!hasContent && status !== 'done') return null

        return (
          <div key={section.id} className="card-surface overflow-hidden">
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-cream-warm/50 transition-colors"
            >
              <span className="text-lg">{section.icon}</span>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-sans font-semibold text-ink">
                  {meta.title || section.id}
                </h3>
                <p className="text-xs text-ink-muted font-sans">{meta.desc}</p>
              </div>
              <svg
                className={`w-4 h-4 text-ink-muted transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            {isExpanded && hasContent && (
              <div className="px-5 pb-4 text-sm text-ink/80 font-sans leading-relaxed space-y-1">
                {renderContent(section.content)}
              </div>
            )}
            {isExpanded && !hasContent && status === 'streaming' && (
              <div className="px-5 pb-4 text-sm text-ink-muted font-sans italic">
                <span className="inline-block w-2 h-4 bg-amber/60 animate-pulse rounded-sm" />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
