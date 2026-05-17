import React, { createContext, useEffect, useState } from 'react'

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

export function I18nProvider({ children }: I18nProviderProps) {
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = localStorage.getItem('language')
    return (stored as Language) || 'es'
  })

  const [translations, setTranslations] = useState<Record<string, string>>({})

  useEffect(() => {
    localStorage.setItem('language', language)
    loadTranslations(language)
  }, [language])

  const loadTranslations = async (lang: Language) => {
    try {
      const module = await import(`../i18n/${lang}`)
      setTranslations(module.default)
    } catch (error) {
      console.error(`Error loading translations for ${lang}:`, error)
    }
  }

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
