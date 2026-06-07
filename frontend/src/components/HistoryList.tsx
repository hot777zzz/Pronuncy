import { useEffect, useState } from 'react'
import { useI18n } from '../i18n/I18nContext'
import { getHistory } from '../services/history'
import type { HistoryItem } from '../services/api'

interface Props {
  sessionId: string
  onSelect: (assessmentId: string) => void
  selectedId: string | null
  refreshKey: number
}

export default function HistoryList({ sessionId, onSelect, selectedId, refreshKey }: Props) {
  const { t } = useI18n()
  const [items, setItems] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!sessionId || !open) return
    setLoading(true)
    getHistory(sessionId, 20, 0)
      .then((res) => setItems(res.items))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [sessionId, open, refreshKey])

  const scoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald'
    if (score >= 50) return 'text-terracotta'
    return 'text-rose'
  }

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed right-4 top-20 z-30 w-10 h-10 rounded-full bg-ink text-cream shadow-lg flex items-center justify-center text-sm hover:bg-ink-light transition-colors"
        title={t('history')}
      >
        {open ? '✕' : '☰'}
      </button>

      {/* Slide-over panel */}
      {open && (
        <div className="fixed inset-0 z-20 flex justify-end pointer-events-none">
          <div
            className="pointer-events-auto w-72 h-full bg-cream border-l border-cream-dark shadow-xl overflow-y-auto animate-slide-up"
          >
            <div className="p-4 border-b border-cream-dark">
              <h2 className="text-base font-display font-semibold italic text-ink">{t('history')}</h2>
            </div>

            {loading && (
              <div className="flex items-center justify-center py-8">
                <div className="w-5 h-5 border-2 border-ink/10 border-t-ink rounded-full animate-spin" />
              </div>
            )}

            {!loading && items.length === 0 && (
              <p className="p-4 text-sm text-ink-muted font-sans">{t('noHistory')}</p>
            )}

            <div className="divide-y divide-cream-dark/50">
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelect(item.id)
                    setOpen(false)
                  }}
                  className={`w-full text-left px-4 py-3 hover:bg-cream-warm transition-colors ${
                    selectedId === item.id ? 'bg-amber/10 border-l-2 border-l-amber' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-sans text-ink truncate">{item.target_text}</p>
                    <span className={`text-sm font-mono font-semibold flex-shrink-0 ${scoreColor(item.overall_score)}`}>
                      {item.overall_score.toFixed(0)}
                    </span>
                  </div>
                  <p className="text-xs text-ink-muted font-sans mt-0.5">
                    {item.created_at?.replace('T', ' ').slice(0, 16)}
                  </p>
                </button>
              ))}
            </div>
          </div>
          <div className="pointer-events-auto flex-shrink-0 w-4" onClick={() => setOpen(false)} />
        </div>
      )}
    </>
  )
}
