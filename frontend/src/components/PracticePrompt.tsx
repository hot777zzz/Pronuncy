import { useCallback, useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n/I18nContext'
import { useAudioRecorder } from '../hooks/useAudioRecorder'
import { assessPronunciation } from '../services/assess'
import type { AssessmentResult, UserConfig } from '../services/api'
import Waveform from './Waveform'
import AnimatedScore from './AnimatedScore'

interface Props {
  sentence: string
  sessionId: string
  config: UserConfig
  onResult: (result: AssessmentResult) => void
}

export default function PracticePrompt({ sentence, sessionId, config, onResult }: Props) {
  const { t } = useI18n()
  const [result, setResult] = useState<AssessmentResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const recorder = useAudioRecorder()
  const assessGate = useRef(false)

  const isRecording = recorder.status === 'recording'
  const hasRecording = recorder.status === 'done' && recorder.blob

  const handleStartRecord = () => {
    setError(null)
    assessGate.current = false
    recorder.start()
  }

  const handleStopRecord = () => {
    if (recorder.status === 'recording') {
      recorder.stop()
    }
  }

  const handleAssess = useCallback(async () => {
    if (!recorder.blob || assessGate.current) return
    assessGate.current = true
    setLoading(true)
    setError(null)
    try {
      const r = await assessPronunciation(recorder.blob, sentence, sessionId)
      setResult(r)
      onResult(r)
    } catch (e: any) {
      setError(e.message || t('errorGeneric'))
    } finally {
      setLoading(false)
    }
  }, [recorder.blob, sentence, sessionId, onResult, t])

  // Auto-assess when recording completes (useEffect, NOT during render)
  useEffect(() => {
    if (hasRecording && !result && !loading && !assessGate.current) {
      handleAssess()
    }
  }, [hasRecording, result, loading, handleAssess])

  // Done state with score
  if (result) {
    return (
      <div className="mt-3 p-3 rounded-xl bg-cream-warm border border-cream-dark/50">
        <div className="flex items-center gap-4">
          <AnimatedScore score={result.overall_score} size="sm" animate={true} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-sans text-ink-muted truncate">&ldquo;{result.target_text}&rdquo;</p>
            <div className="flex flex-wrap gap-1 mt-1.5">
              {result.alignment.slice(0, 15).map((item, i) => {
                const bg = item.status === 'correct' ? 'bg-emerald/10 text-emerald border-emerald/20'
                  : 'bg-terracotta/10 text-terracotta border-terracotta/20'
                return (
                  <div key={i} className={`flex flex-col items-center px-1 py-0.5 rounded border text-[9px] font-mono leading-tight ${bg}`}>
                    <span className="opacity-50">{item.expected}</span>
                    <span className="font-medium">{item.recognized}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
        {result.accent_tips.length > 0 && (
          <div className="mt-2 pt-2 border-t border-cream-dark/30">
            <p className="text-[11px] font-sans text-ink-muted">
              {result.accent_tips.slice(0, 2).map((tip, i) => (
                <span key={i} className="block">{tip.tip}</span>
              ))}
            </p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="mt-3 p-3 rounded-xl bg-cream-warm border border-cream-dark/50">
      {/* Sentence banner */}
      <p className="text-sm font-sans font-medium text-ink mb-3">&ldquo;{sentence}&rdquo;</p>

      {/* Recording UI */}
      {isRecording && (
        <div className="flex flex-col items-center gap-2 mb-3">
          <Waveform active={true} />
          <p className="text-xs text-ink-muted font-sans">{t('recording')}</p>
        </div>
      )}

      {!isRecording && !hasRecording && (
        <div className="mb-3">
          <Waveform active={false} />
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-2 py-2 text-xs text-ink-muted font-sans">
          <div className="w-4 h-4 border-2 border-emerald/20 border-t-emerald rounded-full animate-spin" />
          {t('analyzingDesc')}
        </div>
      )}

      {error && (
        <p className="text-xs text-rose font-sans mb-2">{error}</p>
      )}

      {/* Action buttons */}
      {!loading && (
        <div className="flex gap-2">
          {!isRecording && !hasRecording && (
            <button
              onClick={handleStartRecord}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald text-white text-sm font-sans font-medium hover:bg-emerald/90 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="6"/>
              </svg>
              {t('tapToRecord')}
            </button>
          )}
          {isRecording && (
            <button
              onClick={handleStopRecord}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-rose text-white text-sm font-sans font-medium hover:bg-rose/90 transition-colors animate-pulse"
            >
              <div className="w-3 h-3 bg-white rounded-sm" />
              {t('stop')}
            </button>
          )}
          {hasRecording && !result && (
            <button
              onClick={handleAssess}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-amber text-white text-sm font-sans font-medium hover:bg-amber/90 transition-colors"
            >
              {t('assess')}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
