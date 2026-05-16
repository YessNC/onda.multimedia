import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../../lib/theme'
import { cn } from '../../lib/utils'

type ThemeToggleProps = {
  className?: string
}

export default function ThemeToggle({ className }: ThemeToggleProps) {
  const { preference, theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'
  const label = isDark ? 'Cambiar a modo día' : 'Cambiar a modo noche'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={`${label}${preference === 'system' ? ' (sistema)' : ''}`}
      className={cn(
        'group relative inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-white/10 text-onda-purple shadow-[0_0_20px_rgba(123,44,255,0.18)] transition duration-300 hover:border-onda-neon hover:bg-onda-purple/10 dark:border-onda-purple/25 dark:bg-white/5 dark:text-onda-lavender dark:hover:bg-onda-purple/15',
        className,
      )}
    >
      <span className="absolute inset-0 rounded-full opacity-0 transition duration-300 group-hover:opacity-100 bg-gradient-to-br from-onda-purple/10 to-transparent" />
      {isDark ? <Moon className="relative h-5 w-5" /> : <Sun className="relative h-5 w-5" />}
    </button>
  )
}
