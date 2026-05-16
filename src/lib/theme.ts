import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type ThemeMode = 'light' | 'dark'
export type ThemePreference = ThemeMode | 'system'

type ThemeContextValue = {
  theme: ThemeMode
  preference: ThemePreference
  setThemePreference: (preference: ThemePreference) => void
  toggleTheme: () => void
}

const storageKey = 'onda-multimedia-theme'
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

function isThemePreference(value: string | null): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system'
}

function getSystemTheme(): ThemeMode {
  if (typeof window === 'undefined') {
    return 'dark'
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function getInitialPreference(): ThemePreference {
  if (typeof window === 'undefined') {
    return 'system'
  }

  const storedPreference = window.localStorage.getItem(storageKey)
  return isThemePreference(storedPreference) ? storedPreference : 'system'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState<ThemePreference>(getInitialPreference)
  const [systemTheme, setSystemTheme] = useState<ThemeMode>(getSystemTheme)
  const theme = preference === 'system' ? systemTheme : preference

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => setSystemTheme(media.matches ? 'dark' : 'light')

    handleChange()
    media.addEventListener('change', handleChange)

    return () => media.removeEventListener('change', handleChange)
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.documentElement.dataset.theme = theme
  }, [theme])

  const setThemePreference = useCallback((nextPreference: ThemePreference) => {
    setPreference(nextPreference)

    if (nextPreference === 'system') {
      window.localStorage.removeItem(storageKey)
      return
    }

    window.localStorage.setItem(storageKey, nextPreference)
  }, [])

  const toggleTheme = useCallback(() => {
    setThemePreference(theme === 'dark' ? 'light' : 'dark')
  }, [setThemePreference, theme])

  const value = useMemo(
    () => ({
      theme,
      preference,
      setThemePreference,
      toggleTheme,
    }),
    [preference, setThemePreference, theme, toggleTheme],
  )

  return createElement(ThemeContext.Provider, { value }, children)
}

export function useTheme() {
  const context = useContext(ThemeContext)

  if (!context) {
    throw new Error('useTheme debe usarse dentro de ThemeProvider')
  }

  return context
}
