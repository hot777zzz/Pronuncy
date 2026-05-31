import { useI18n } from '../i18n/I18nContext'
import ModelBadge from './ModelBadge'

export default function StatusBar() {
  const { lang, toggleLang, t } = useI18n()

  return (
    <header className="flex items-center justify-between pt-2 pb-1">
      <div className="flex items-baseline gap-3">
        <h1 className="text-2xl font-display font-semibold tracking-tight text-ink italic">
          {t('appTitle')}
        </h1>
        <ModelBadge />
      </div>
      <button
        onClick={toggleLang}
        className="text-xs font-sans font-semibold px-3 py-1.5 rounded-full bg-cream-warm text-ink-muted hover:bg-cream-dark hover:text-ink transition-all duration-200"
        aria-label="Switch language"
      >
        {lang === 'en' ? '中文' : 'EN'}
      </button>
    </header>
  )
}
