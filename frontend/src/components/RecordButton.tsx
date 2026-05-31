import { useI18n } from '../i18n/I18nContext'
import type { TranslationKey } from '../i18n/translations'

type Status = 'idle' | 'requesting' | 'recording' | 'done'

interface Props {
  status: Status
  onToggle: () => void
}

const labelMap: Record<Status, TranslationKey> = {
  requesting: 'requestingMic',
  idle: 'tapToRecord',
  recording: 'recording',
  done: 'recorded',
}

export default function RecordButton({ status, onToggle }: Props) {
  const { t } = useI18n()
  const isRecording = status === 'recording'

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Outer ring */}
      <div
        className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-700 ${
          isRecording
            ? 'ring-pulse bg-terracotta/10'
            : 'bg-cream-warm'
        }`}
      >
        {/* Inner button */}
        <button
          onClick={onToggle}
          disabled={status === 'requesting'}
          className={`relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 active:scale-90 ${
            isRecording
              ? 'bg-terracotta hover:bg-terracotta-dark shadow-lg shadow-terracotta/25'
              : 'bg-ink hover:bg-ink-light shadow-lg shadow-ink/15 hover:scale-105'
          } disabled:opacity-40 disabled:cursor-not-allowed`}
          aria-label={isRecording ? 'Stop recording' : 'Start recording'}
        >
          {isRecording ? (
            <span className="w-[18px] h-[18px] rounded-[3px] bg-white" />
          ) : (
            <MicIcon />
          )}
        </button>
      </div>

      <span
        className={`text-sm font-sans font-medium transition-colors duration-300 ${
          isRecording ? 'text-terracotta' : 'text-ink-muted'
        }`}
      >
        {t(labelMap[status])}
      </span>
    </div>
  )
}

function MicIcon() {
  return (
    <svg className="w-[22px] h-[22px]" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </svg>
  )
}
