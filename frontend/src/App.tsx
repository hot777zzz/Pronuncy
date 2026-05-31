import { useCallback, useState } from 'react'
import { useAudioRecorder } from './hooks/useAudioRecorder'
import { assessPronunciation } from './services/assess'
import type { AssessmentResult } from './services/api'
import { useI18n } from './i18n/I18nContext'
import StatusBar from './components/StatusBar'
import PracticeCard from './components/PracticeCard'
import Waveform from './components/Waveform'
import RecordButton from './components/RecordButton'
import ResultsPanel from './components/ResultsPanel'

export default function App() {
  const { t } = useI18n()
  const [targetText, setTargetText] = useState('Hello world')
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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50">
      <div className="max-w-xl mx-auto px-5 py-8 flex flex-col gap-6">
        <StatusBar />

        <PracticeCard sentence={targetText} onEdit={setTargetText} />

        {/* Recording area */}
        <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 p-8 flex flex-col items-center">
          <Waveform active={isRecording} />
          <RecordButton status={recorder.status} onToggle={handleToggle} />

          {hasRecording && (
            <div className="flex flex-col items-center gap-3 mt-6 w-full animate-fade-in-up">
              {recorder.url && (
                <audio controls src={recorder.url} className="w-full h-9 rounded-lg" />
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    recorder.reset()
                    setResult(null)
                    setError(null)
                  }}
                  className="px-5 py-2.5 rounded-full text-sm font-semibold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  {t('reRecord')}
                </button>
                <button
                  onClick={handleAssess}
                  disabled={loading}
                  className="px-6 py-2.5 rounded-full text-sm font-semibold text-white bg-gray-900 hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
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
            <div className="flex items-center gap-3 mt-4 text-sm text-gray-400">
              <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
              {t('analyzingDesc')}
            </div>
          )}

          {(error || recorder.error) && (
            <div className="mt-4 px-4 py-2.5 bg-red-50 text-red-500 text-sm rounded-xl">
              {error || recorder.error}
            </div>
          )}
        </div>

        <ResultsPanel result={result} />
      </div>
    </div>
  )
}
