import { useI18n } from '../i18n/I18nContext'

export default function StatusBar() {
  const { lang, toggleLang, t } = useI18n()

  return (
    <header className="flex items-center justify-between">
      <h1 className="text-2xl font-bold tracking-tight text-gray-900">{t('appTitle')}</h1>
      <button
        onClick={toggleLang}
        className="text-sm font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
        aria-label="Switch language"
      >
        {lang === 'en' ? '中' : 'EN'}
      </button>
    </header>
  )
}
