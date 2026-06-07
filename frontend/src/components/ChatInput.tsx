import { useCallback, useRef, useState } from 'react'
import gsap from 'gsap'
import { useI18n } from '../i18n/I18nContext'

interface Props {
  onSend: (text: string) => void
  disabled: boolean
  placeholder?: string
}

export default function ChatInput({ onSend, disabled, placeholder }: Props) {
  const { t } = useI18n()
  const [text, setText] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = useCallback(() => {
    const trimmed = text.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setText('')

    gsap.fromTo(inputRef.current,
      { scale: 1.02 },
      { scale: 1, duration: 0.2, ease: 'power2.out' },
    )
  }, [text, disabled, onSend])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="card-surface p-3">
      <div className="flex items-end gap-2">
        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder={placeholder || t('typeMessage')}
          disabled={disabled}
          className="flex-1 resize-none bg-transparent text-sm font-sans text-ink placeholder:text-ink-muted/40 outline-none py-1.5 max-h-24"
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || disabled}
          className="w-10 h-10 rounded-full bg-ink text-white flex items-center justify-center flex-shrink-0 hover:bg-ink-light transition-colors disabled:opacity-20"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
          </svg>
        </button>
      </div>
    </div>
  )
}
