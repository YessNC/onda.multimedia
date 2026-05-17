import { useI18n } from '../../hooks/useI18n'

export default function LanguageToggle() {
  const { language, setLanguage } = useI18n()

  return (
    <button
      onClick={() => setLanguage(language === 'es' ? 'en' : 'es')}
      className="hidden items-center gap-1 rounded-md border border-onda-purple/18 bg-white/80 px-3 py-2 font-display text-[0.68rem] font-bold uppercase tracking-[0.18em] text-onda-purple shadow-[0_0_22px_rgba(123,44,255,0.1)] transition duration-300 hover:border-onda-purple hover:bg-onda-purple/10 lg:inline-flex dark:border-onda-purple/30 dark:bg-white/5 dark:text-onda-lavender dark:shadow-[0_0_22px_rgba(123,44,255,0.14)]"
      aria-label={`Switch to ${language === 'es' ? 'English' : 'Español'}`}
      title={`${language === 'es' ? 'English' : 'Español'}`}
    >
      <span className={language === 'es' ? 'text-onda-purple dark:text-onda-lavender' : 'opacity-50'}>
        ES
      </span>
      <span className="opacity-30">|</span>
      <span className={language === 'en' ? 'text-onda-purple dark:text-onda-lavender' : 'opacity-50'}>
        EN
      </span>
    </button>
  )
}
