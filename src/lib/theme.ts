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

export const THEME_STORAGE_KEY = 'onda-multimedia-theme'
const systemThemeQuery = '(prefers-color-scheme: dark)'
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

function isThemePreference(value: string | null): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system'
}

function getStoredPreference(): ThemePreference {
  if (typeof window === 'undefined') {
    return 'system'
  }

  try {
    const storedPreference = window.localStorage.getItem(THEME_STORAGE_KEY)
    return isThemePreference(storedPreference) ? storedPreference : 'system'
  } catch {
    return 'system'
  }
}

function getSystemTheme(): ThemeMode {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'light'
  }

  try {
    return window.matchMedia(systemThemeQuery).matches ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

function getInitialPreference(): ThemePreference {
  return getStoredPreference()
}

function applyTheme(theme: ThemeMode, preference: ThemePreference) {
  if (typeof document === 'undefined') return

  const root = document.documentElement

  root.classList.toggle('dark', theme === 'dark')
  root.dataset.theme = theme
  root.dataset.themePreference = preference
  root.style.colorScheme = theme
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState<ThemePreference>(getInitialPreference)
  const [systemTheme, setSystemTheme] = useState<ThemeMode>(getSystemTheme)
  const theme = preference === 'system' ? systemTheme : preference

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined
    }

    const media = window.matchMedia(systemThemeQuery)
    const handleChange = (event?: MediaQueryListEvent) => {
      setSystemTheme((event?.matches ?? media.matches) ? 'dark' : 'light')
    }

    handleChange()

    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', handleChange)
      return () => media.removeEventListener('change', handleChange)
    }

    media.addListener(handleChange)
    return () => media.removeListener(handleChange)
  }, [])

  useEffect(() => {
    applyTheme(theme, preference)
  }, [preference, theme])

  const setThemePreference = useCallback((nextPreference: ThemePreference) => {
    setPreference(nextPreference)

    try {
      if (nextPreference === 'system') {
        window.localStorage.removeItem(THEME_STORAGE_KEY)
        return
      }

      window.localStorage.setItem(THEME_STORAGE_KEY, nextPreference)
    } catch {
      // Storage can be unavailable in restricted browser modes; the in-memory preference still applies.
    }
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
