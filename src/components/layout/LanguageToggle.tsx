import { useI18n } from '../../hooks/useI18n'

export default function LanguageToggle() {
  const { language, setLanguage } = useI18n()

  return (
    <button
      type="button"
      onClick={() => setLanguage(language === 'es' ? 'en' : 'es')}
      className="group relative inline-flex h-10 shrink-0 items-center overflow-hidden rounded-full border border-onda-purple/20 bg-white/[0.82] px-2 text-[0.68rem] font-display font-bold uppercase tracking-[0.12em] text-onda-purple shadow-[0_0_20px_rgba(123,44,255,0.12)] backdrop-blur-xl transition duration-300 hover:border-onda-purple/45 hover:bg-white sm:h-11 dark:border-onda-lavender/30 dark:bg-white/[0.08] dark:text-onda-lavender dark:shadow-[0_0_20px_rgba(123,44,255,0.18)]"
      aria-label={`Switch to ${language === 'es' ? 'English' : 'Español'}`}
      title={`${language === 'es' ? 'English' : 'Español'}`}
    >
      <span className={language === 'es' ? 'px-2 text-onda-purple dark:text-onda-lavender' : 'px-2 opacity-50'}>
        ES
      </span>
      <span className="opacity-30">|</span>
      <span className={language === 'en' ? 'px-2 text-onda-purple dark:text-onda-lavender' : 'px-2 opacity-50'}>
        EN
      </span>
    </button>
  )
}
