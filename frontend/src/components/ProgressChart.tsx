import { useEffect, useState } from 'react'
import { useI18n } from '../i18n/I18nContext'
import { getProgress } from '../services/history'
import type { PhonemeProgress } from '../services/api'

interface Props {
  sessionId: string
  refreshKey: number
}

export default function ProgressChart({ sessionId, refreshKey }: Props) {
  const { t } = useI18n()
  const [phonemes, setPhonemes] = useState<PhonemeProgress[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!sessionId) return
    setLoading(true)
    getProgress(sessionId)
      .then((res) => setPhonemes(res.phonemes.filter((p) => p.total_attempts >= 2)))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [sessionId, refreshKey])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="w-4 h-4 border-2 border-ink/10 border-t-ink rounded-full animate-spin" />
      </div>
    )
  }

  if (phonemes.length === 0) return null

  // Sparkline: SVG polyline of recent scores
  const renderSparkline = (history: { overall_score: number }[]) => {
    const scores = history.slice(0, 10).reverse() // chronological
    if (scores.length < 2) return null

    const w = 80
    const h = 24
    const pad = 2
    const max = 100
    const min = Math.min(...scores.map((s) => s.overall_score), 40)

    const points = scores.map((s, i) => {
      const x = pad + (i / (scores.length - 1)) * (w - 2 * pad)
      const y = pad + (1 - (s.overall_score - min) / (max - min)) * (h - 2 * pad)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })

    return (
      <svg width={w} height={h} className="flex-shrink-0">
        <polyline
          points={points.join(' ')}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-amber"
        />
      </svg>
    )
  }

  const correctRate = (p: PhonemeProgress) =>
    p.total_attempts > 0 ? Math.round((p.correct_count / p.total_attempts) * 100) : 0

  return (
    <div className="card-surface p-4 mt-4">
      <h3 className="text-sm font-sans font-semibold text-ink mb-3">{t('progress')}</h3>
      <div className="space-y-2">
        {phonemes.map((p) => (
          <div key={p.phoneme} className="flex items-center gap-3">
            <code className="w-10 text-xs font-mono text-ink/70 text-right">{p.phoneme}</code>
            <div className="flex-1 h-2 bg-cream-dark rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald rounded-full transition-all duration-500"
                style={{ width: `${correctRate(p)}%` }}
              />
            </div>
            <span className="text-xs font-mono text-ink-muted w-8 text-right">
              {correctRate(p)}%
            </span>
            <span className="text-xs font-mono text-ink-muted/60 w-10 text-right">
              ×{p.total_attempts}
            </span>
            {renderSparkline(p.recent_history)}
          </div>
        ))}
      </div>
    </div>
  )
}
