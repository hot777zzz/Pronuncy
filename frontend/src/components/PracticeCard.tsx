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
      <div className="card-surface p-6 animate-fade-in">
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
          className="w-full text-2xl font-display font-semibold italic text-ink bg-transparent border-none outline-none resize-none leading-relaxed text-balance placeholder:text-ink-muted/40"
          rows={2}
          placeholder={t('typeSentence')}
        />
        <p className="text-xs text-ink-muted/50 mt-2 font-sans">{t('pressEnter')}</p>
      </div>
    )
  }

  return (
    <div
      className="card-surface p-6 cursor-text transition-all duration-300 hover:border-amber/30 hover:shadow-md group"
      onClick={() => {
        setDraft('')
        setEditing(true)
      }}
    >
      <p className="text-2xl font-display font-semibold italic text-ink leading-relaxed text-balance">
        {sentence || t('targetPlaceholder')}
      </p>
      {sentence && (
        <p className="text-xs text-ink-muted/40 mt-3 font-sans group-hover:text-amber transition-colors duration-300">
          {t('clickToEdit')}
        </p>
      )}
    </div>
  )
}
