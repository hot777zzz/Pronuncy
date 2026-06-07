import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { useI18n } from '../i18n/I18nContext'
import type { UserConfig } from '../services/api'

interface Props {
  config: UserConfig
  onSave: (config: UserConfig) => void
  onClose: () => void
}

export function loadConfig(): UserConfig {
  try {
    const raw = localStorage.getItem('pronuncy_config')
    if (raw) return JSON.parse(raw) as UserConfig
  } catch {}
  return { apiKey: '', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o' }
}

export function saveConfig(config: UserConfig) {
  localStorage.setItem('pronuncy_config', JSON.stringify(config))
}

export default function SettingsModal({ config, onSave, onClose }: Props) {
  const { t } = useI18n()
  const [key, setKey] = useState(config.apiKey)
  const [baseUrl, setBaseUrl] = useState(config.baseUrl)
  const [model, setModel] = useState(config.model)
  const overlayRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.25 })
    gsap.fromTo(panelRef.current,
      { opacity: 0, scale: 0.92, y: 20 },
      { opacity: 1, scale: 1, y: 0, duration: 0.35, ease: 'back.out(1.4)' },
    )
  }, [])

  const handleSave = () => {
    const newConfig: UserConfig = { apiKey: key, baseUrl: baseUrl.replace(/\/$/, ''), model }
    onSave(newConfig)
    saveConfig(newConfig)

    gsap.to(overlayRef.current, { opacity: 0, duration: 0.2 })
    gsap.to(panelRef.current, {
      opacity: 0, scale: 0.95, y: 10, duration: 0.2,
      onComplete: onClose,
    })
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) {
      gsap.to(overlayRef.current, { opacity: 0, duration: 0.15 })
      gsap.to(panelRef.current, {
        opacity: 0, scale: 0.95, duration: 0.15,
        onComplete: onClose,
      })
    }
  }

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm"
    >
      <div ref={panelRef} className="w-[90vw] max-w-md card-surface p-6 space-y-5 shadow-xl">
        <h2 className="text-lg font-display font-semibold italic text-ink">
          {t('apiSettings')}
        </h2>

        <label className="block space-y-1.5">
          <span className="text-[11px] font-sans font-semibold text-ink-muted uppercase tracking-widest">
            {t('apiKey')}
          </span>
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="sk-..."
            className="w-full px-3 py-2.5 rounded-lg border border-cream-dark bg-cream text-sm font-mono text-ink placeholder:text-ink-muted/40 focus:outline-none focus:border-amber/50 transition-colors"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-[11px] font-sans font-semibold text-ink-muted uppercase tracking-widest">
            {t('baseUrl')}
          </span>
          <input
            type="text"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://api.openai.com/v1"
            className="w-full px-3 py-2.5 rounded-lg border border-cream-dark bg-cream text-sm font-mono text-ink placeholder:text-ink-muted/40 focus:outline-none focus:border-amber/50 transition-colors"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-[11px] font-sans font-semibold text-ink-muted uppercase tracking-widest">
            {t('model')}
          </span>
          <input
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="gpt-4o"
            className="w-full px-3 py-2.5 rounded-lg border border-cream-dark bg-cream text-sm font-mono text-ink placeholder:text-ink-muted/40 focus:outline-none focus:border-amber/50 transition-colors"
          />
        </label>

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={!key || !baseUrl || !model}
            className="flex-1 py-3 rounded-xl bg-ink text-white font-sans font-semibold text-sm hover:bg-ink-light transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {t('save')}
          </button>
          <button
            onClick={() => {
              gsap.to(overlayRef.current, { opacity: 0, duration: 0.15 })
              gsap.to(panelRef.current, {
                opacity: 0, scale: 0.95, duration: 0.15,
                onComplete: onClose,
              })
            }}
            className="px-4 py-3 rounded-xl text-ink-muted font-sans text-sm hover:bg-cream-warm transition-colors"
          >
            {t('skip')}
          </button>
        </div>
      </div>
    </div>
  )
}
