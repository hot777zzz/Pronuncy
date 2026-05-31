import { useState } from 'react'
import { useI18n } from '../i18n/I18nContext'

interface Props {
  sentence: string
  onEdit: (text: string) => void
}

export default function PracticeCard({ sentence, onEdit }: Props) {
  const { t } = useI18n()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(sentence)

  const handleSave = () => {
    const trimmed = draft.trim()
    if (trimmed) {
      onEdit(trimmed)
    } else {
      setDraft(sentence)
    }
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 p-8 animate-fade-in-up">
        <textarea
          autoFocus
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={handleSave}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSave()
            }
          }}
          className="w-full text-3xl font-bold text-gray-900 bg-transparent border-none outline-none resize-none leading-relaxed text-balance"
          rows={2}
          placeholder={t('typeSentence')}
        />
        <p className="text-sm text-gray-400 mt-2">{t('pressEnter')}</p>
      </div>
    )
  }

  return (
    <div
      className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 p-8 cursor-text transition-shadow hover:shadow-2xl hover:shadow-gray-200/60"
      onClick={() => {
        setDraft(sentence)
        setEditing(true)
      }}
    >
      <p className="text-3xl font-bold text-gray-900 leading-relaxed text-balance">
        {sentence || t('targetPlaceholder')}
      </p>
      {sentence && (
        <p className="text-sm text-gray-400 mt-3">{t('clickToEdit')}</p>
      )}
    </div>
  )
}
