import { useI18n } from '../i18n/I18nContext'

export interface ThinkingStep {
  id: string
  label: string
  status: 'pending' | 'loading' | 'done'
  detail?: string
}

interface Props {
  steps: ThinkingStep[]
}

const icons: Record<string, string> = {
  analyze: '🔍',
  history: '📊',
  patterns: '🧩',
  craft: '✍️',
}

export default function AgentThinkingStream({ steps }: Props) {
  if (steps.length === 0) return null

  return (
    <div className="space-y-2 py-3">
      {steps.map((step, i) => {
        const isActive = step.status !== 'pending'
        const isDone = step.status === 'done'
        const opacity = isActive ? 'opacity-100' : 'opacity-30'
        return (
          <div
            key={step.id}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-500 ${opacity}`}
          >
            {/* Icon / spinner */}
            <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center text-sm">
              {isDone ? (
                <span className="text-emerald text-xs">✓</span>
              ) : isActive && step.status === 'loading' ? (
                <div className="w-4 h-4 border-2 border-amber/20 border-t-amber rounded-full animate-spin" />
              ) : (
                <span>{icons[step.id] || '●'}</span>
              )}
            </div>
            {/* Label + detail */}
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-sans ${isDone ? 'text-ink' : isActive ? 'text-ink' : 'text-ink-muted'}`}>
                {step.label}
              </p>
              {step.detail && isActive && (
                <p className="text-xs text-ink-muted mt-0.5 truncate font-mono">{step.detail}</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function createInitialSteps(): ThinkingStep[] {
  return [
    { id: 'analyze', label: 'Analyzing pronunciation data', status: 'pending' },
    { id: 'history', label: 'Checking past performance', status: 'pending' },
    { id: 'patterns', label: 'Identifying error patterns', status: 'pending' },
    { id: 'craft', label: 'Crafting personalized feedback', status: 'pending' },
  ]
}
