import React, { createContext, useEffect, useState } from 'react'
import es from '../i18n/es'
import en from '../i18n/en'

export type Language = 'es' | 'en'

interface I18nContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

export const I18nContext = createContext<I18nContextType | undefined>(undefined)

interface I18nProviderProps {
  children: React.ReactNode
}

const dictionaries: Record<Language, Record<string, string>> = {
  es,
  en,
}

const getInitialLanguage = (): Language => {
  const stored = localStorage.getItem('language')

  if (stored === 'es' || stored === 'en') {
    return stored
  }

  return 'es'
}

export function I18nProvider({ children }: I18nProviderProps) {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage)

  const [translations, setTranslations] = useState<Record<string, string>>(
    dictionaries[language] || dictionaries.es
  )

  useEffect(() => {
    localStorage.setItem('language', language)
    setTranslations(dictionaries[language] || dictionaries.es)
  }, [language])

  const t = (key: string): string => {
    return translations[key] || key
  }

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
  }

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  )
}