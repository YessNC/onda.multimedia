import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../../lib/theme'
import { cn } from '../../lib/utils'

type ThemeToggleProps = {
  className?: string
}

export default function ThemeToggle({ className }: ThemeToggleProps) {
  const { preference, theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'
  const label = isDark ? 'Cambiar a modo dia' : 'Cambiar a modo noche'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={`${label}${preference === 'system' ? ' (sistema)' : ''}`}
      className={cn(
        'group relative inline-flex h-11 w-11 items-center justify-center rounded-md border border-onda-purple/25 bg-white/65 text-onda-purple shadow-sm transition duration-300 hover:border-onda-purple hover:bg-onda-purple/10 dark:bg-white/5 dark:text-onda-lavender dark:hover:bg-onda-purple/15',
        className,
      )}
    >
      <span className="absolute inset-0 rounded-md opacity-0 shadow-[0_0_22px_rgba(157,78,221,0.42)] transition group-hover:opacity-100" />
      {isDark ? <Moon className="relative h-5 w-5" /> : <Sun className="relative h-5 w-5" />}
    </button>
  )
}
