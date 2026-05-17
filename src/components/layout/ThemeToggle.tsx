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
      role="switch"
      aria-checked={isDark}
      aria-label={label}
      title={`${label}${preference === 'system' ? ' (sistema)' : ''}`}
      className={cn(
        'group relative inline-flex h-10 w-[4.25rem] shrink-0 items-center overflow-hidden rounded-full border border-onda-purple/20 bg-white/[0.82] p-1 text-onda-purple shadow-[0_0_20px_rgba(123,44,255,0.12)] backdrop-blur-xl transition duration-300 hover:border-onda-purple/45 hover:bg-white sm:h-11 sm:w-[5.75rem] dark:border-onda-lavender/30 dark:bg-white/[0.08] dark:text-onda-lavender dark:shadow-[0_0_20px_rgba(123,44,255,0.18)] dark:hover:border-onda-lavender/50 dark:hover:bg-white/10',
        className,
      )}
    >
      <span
        className={cn(
          'absolute left-1 top-1 h-8 w-8 rounded-full bg-white shadow-[0_8px_24px_rgba(123,44,255,0.18)] transition-transform duration-300 ease-out sm:h-9 sm:w-9 dark:bg-onda-purple dark:shadow-[0_8px_24px_rgba(123,44,255,0.34)]',
          isDark ? 'translate-x-7 sm:translate-x-[2.75rem]' : 'translate-x-0',
        )}
      />
      <span
        className={cn(
          'relative z-10 flex h-8 w-8 items-center justify-center rounded-full transition duration-300 sm:h-9 sm:w-9',
          isDark ? 'text-white/[0.45]' : 'text-onda-purple',
        )}
      >
        <Sun className="h-4 w-4 sm:h-5 sm:w-5" />
      </span>
      <span
        className={cn(
          'relative z-10 ml-auto flex h-8 w-8 items-center justify-center rounded-full transition duration-300 sm:h-9 sm:w-9',
          isDark ? 'text-white' : 'text-zinc-400',
        )}
      >
        <Moon className="h-4 w-4 sm:h-5 sm:w-5" />
      </span>
    </button>
  )
}
