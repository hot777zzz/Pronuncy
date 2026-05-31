import { useCallback, useState } from 'react'
import { useAudioRecorder } from './hooks/useAudioRecorder'
import { assessPronunciation } from './services/assess'
import type { AssessmentResult } from './services/api'
import { useI18n } from './i18n/I18nContext'
import { randomQuote } from './utils/quotes'
import StatusBar from './components/StatusBar'
import PracticeCard from './components/PracticeCard'
import Waveform from './components/Waveform'
import RecordButton from './components/RecordButton'
import ResultsPanel from './components/ResultsPanel'

export default function App() {
  const { t } = useI18n()
  const [targetText, setTargetText] = useState(() => randomQuote())
  const [result, setResult] = useState<AssessmentResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const recorder = useAudioRecorder()

  const handleToggle = useCallback(() => {
    setError(null)
    setResult(null)
    if (recorder.status === 'recording') {
      recorder.stop()
    } else {
      recorder.start()
    }
  }, [recorder])

  const handleAssess = useCallback(async () => {
    if (!recorder.blob || !targetText.trim()) return
    setLoading(true)
    setError(null)
    try {
      const r = await assessPronunciation(recorder.blob, targetText.trim())
      setResult(r)
    } catch (e: any) {
      setError(e.message || t('errorGeneric'))
    } finally {
      setLoading(false)
    }
  }, [recorder.blob, targetText, t])

  const hasRecording = recorder.status === 'done' && recorder.blob
  const isRecording = recorder.status === 'recording'

  return (
    <div className="min-h-screen bg-cream relative">
      {/* Faint ambient gradient */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-amber/5 rounded-full blur-[120px] translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald/5 rounded-full blur-[100px] -translate-x-1/3 translate-y-1/2" />
      </div>

      <div className="max-w-xl mx-auto px-5 py-6 flex flex-col gap-6">
        <StatusBar />

        <PracticeCard sentence={targetText} onEdit={setTargetText} />

        {/* Recording area */}
        <div className="card-surface p-8 flex flex-col items-center">
          <Waveform active={isRecording} />
          <RecordButton status={recorder.status} onToggle={handleToggle} />

          {hasRecording && (
            <div className="flex flex-col items-center gap-3 mt-6 w-full animate-fade-in">
              {recorder.url && (
                <audio
                  controls
                  src={recorder.url}
                  className="w-full h-9 rounded-lg opacity-70 hover:opacity-100 transition-opacity"
                />
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    recorder.reset()
                    setResult(null)
                    setError(null)
                  }}
                  className="px-5 py-2.5 rounded-full text-sm font-sans font-medium text-ink-muted bg-cream-warm hover:bg-cream-dark transition-colors duration-200"
                >
                  {t('reRecord')}
                </button>
                <button
                  onClick={handleAssess}
                  disabled={loading}
                  className="px-6 py-2.5 rounded-full text-sm font-sans font-semibold text-white bg-ink hover:bg-ink-light transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shadow-ink/10"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg
                        className="animate-spin w-4 h-4"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <circle
                          className="opacity-20"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-80"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      {t('analyzing')}
                    </span>
                  ) : (
                    t('assess')
                  )}
                </button>
              </div>
            </div>
          )}

          {loading && !hasRecording && (
            <div className="flex items-center gap-3 mt-4 text-sm text-ink-muted font-sans">
              <div className="w-4 h-4 border-2 border-ink/10 border-t-ink rounded-full animate-spin" />
              {t('analyzingDesc')}
            </div>
          )}

          {(error || recorder.error) && (
            <div className="mt-4 px-4 py-3 bg-rose/10 text-rose border border-rose/20 text-sm rounded-xl font-sans">
              {error || recorder.error}
            </div>
          )}
        </div>

        <ResultsPanel result={result} />
      </div>
    </div>
  )
}
