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
    <div className="flex flex-col items-center gap-4">
      <button
        onClick={onToggle}
        disabled={status === 'requesting'}
        className={`
          relative w-20 h-20 rounded-full flex items-center justify-center
          transition-all duration-200 active:scale-95
          ${isRecording
            ? 'bg-red-500 hover:bg-red-600 animate-record-pulse'
            : 'bg-red-500 hover:bg-red-600 hover:scale-105 shadow-lg shadow-red-500/30'
          }
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
        aria-label={isRecording ? 'Stop recording' : 'Start recording'}
      >
        {isRecording ? (
          <div className="w-6 h-6 rounded-sm bg-white" />
        ) : (
          <div className="w-6 h-6 rounded-full bg-white" />
        )}
      </button>
      <span className="text-sm font-medium text-gray-400 transition-colors">
        {t(labelMap[status])}
      </span>
    </div>
  )
}
