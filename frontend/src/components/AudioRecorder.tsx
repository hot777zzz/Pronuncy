import { useState } from 'react'
import { useAudioRecorder } from '../hooks/useAudioRecorder'
import { assessPronunciation } from '../services/assess'
import type { AssessmentResult } from '../services/api'
import './AudioRecorder.css'

interface Props {
  targetText: string
  onResult: (result: AssessmentResult) => void
}

function formatTime(ms: number) {
  const s = Math.floor(ms / 1000)
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

export default function AudioRecorder({ targetText, onResult }: Props) {
  const recorder = useAudioRecorder()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleToggle = () => {
    setError(null)
    if (recorder.status === 'recording') {
      recorder.stop()
    } else {
      recorder.start()
    }
  }

  const handleAssess = async () => {
    if (!recorder.blob || !targetText.trim()) return
    setLoading(true)
    setError(null)
    try {
      const result = await assessPronunciation(recorder.blob, targetText.trim())
      onResult(result)
    } catch (e: any) {
      setError(e.message || 'Failed to assess pronunciation')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card">
      <div className="card-title">Record</div>
      <p style={{ fontSize: 14, color: 'var(--text-dim)' }}>
        Click record, read the sentence aloud, then click stop.
      </p>

      <div className="btn-row">
        <button
          className={`btn-record${recorder.status === 'recording' ? ' recording' : ''}`}
          onClick={handleToggle}
          disabled={recorder.status === 'requesting'}
        >
          {recorder.status === 'recording'
            ? '⏹ Stop Recording'
            : recorder.status === 'requesting'
              ? '⏳ Requesting Mic...'
              : '● Start Recording'}
        </button>

        {recorder.status === 'recording' && (
          <>
            <span className="timer">{formatTime(recorder.elapsed)}</span>
            <span className="recording-indicator">● Recording</span>
          </>
        )}
      </div>

      <div className={`audio-section${recorder.status === 'done' ? ' visible' : ''}`}>
        <audio key={recorder.url} controls src={recorder.url ?? undefined} />
        <div className="btn-row">
          <button
            className="btn-play"
            onClick={() => {
              recorder.reset()
              setError(null)
            }}
          >
            Re-record
          </button>
          <button
            className="btn-assess"
            disabled={loading || !targetText.trim()}
            onClick={handleAssess}
          >
            {loading ? 'Analyzing...' : 'Assess Pronunciation'}
          </button>
        </div>
      </div>

      {loading && <div className="loading visible">Analyzing your pronunciation...</div>}
      {(error || recorder.error) && (
        <div className="error-msg visible">{error || recorder.error}</div>
      )}
    </div>
  )
}
