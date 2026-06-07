import { useCallback, useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { useI18n } from './i18n/I18nContext'
import type { UserConfig } from './services/api'
import SettingsModal, { loadConfig } from './components/SettingsModal'
import AgentChat from './components/AgentChat'
import HistoryList from './components/HistoryList'
import StatusBar from './components/StatusBar'

function getSessionId(): string {
  const stored = localStorage.getItem('pronuncy_session_id')
  if (stored) return stored
  const newId = crypto.randomUUID()
  localStorage.setItem('pronuncy_session_id', newId)
  return newId
}

export default function App() {
  const { t } = useI18n()
  const [config, setConfig] = useState<UserConfig>(loadConfig)
  const [showSettings, setShowSettings] = useState(false)
  const [sessionId] = useState(getSessionId)
  const [historyRefresh, setHistoryRefresh] = useState(0)
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null)
  const appRef = useRef<HTMLDivElement>(null)
  const hasApiKey = config.apiKey.length > 0

  // Entrance animation
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.app-header', { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' })
      gsap.fromTo('.app-chat', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, delay: 0.15, ease: 'power2.out' })
    }, appRef)
    return () => ctx.revert()
  }, [])

  const handleSaveConfig = useCallback((newConfig: UserConfig) => {
    setConfig(newConfig)
    setShowSettings(false)
  }, [])

  const handleHistorySelect = useCallback((id: string) => {
    setSelectedHistoryId(id)
  }, [])

  return (
    <div ref={appRef} className="min-h-screen bg-cream relative">
      {/* Ambient gradient */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-amber/5 rounded-full blur-[120px] translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald/5 rounded-full blur-[100px] -translate-x-1/3 translate-y-1/2" />
      </div>

      {/* Settings modal */}
      {showSettings && (
        <SettingsModal
          config={config}
          onSave={handleSaveConfig}
          onClose={() => setShowSettings(false)}
        />
      )}

      <div className="max-w-2xl mx-auto px-4 py-4 flex flex-col min-h-screen">
        {/* Header */}
        <div className="app-header flex items-center justify-between mb-2">
          <StatusBar />
          <div className="flex items-center gap-2">
            {!hasApiKey && (
              <button
                onClick={() => setShowSettings(true)}
                className="px-2.5 py-1 rounded-full text-[11px] font-sans font-medium text-terracotta bg-terracotta/8 border border-terracotta/15 hover:bg-terracotta/15 transition-colors"
              >
                {t('setupAi')}
              </button>
            )}
            <button
              onClick={() => setShowSettings(true)}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all text-xs ${
                !hasApiKey ? 'text-terracotta/70 hover:text-terracotta hover:bg-terracotta/10' : 'text-ink-muted/60 hover:text-ink hover:bg-cream-dark/50'
              }`}
              title={t('settings')}
            >
              ⚙
            </button>
          </div>
        </div>

        {/* Main chat */}
        <div className="app-chat flex-1">
          <AgentChat sessionId={sessionId} config={config} />
        </div>
      </div>

      {/* History sidebar */}
      <HistoryList
        sessionId={sessionId}
        onSelect={handleHistorySelect}
        selectedId={selectedHistoryId}
        refreshKey={historyRefresh}
      />
    </div>
  )
}
