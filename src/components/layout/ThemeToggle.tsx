import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from '../../lib/theme'
import { cn } from '../../lib/utils'

type ThemeToggleProps = {
  className?: string
}

export default function ThemeToggle({ className }: ThemeToggleProps) {
  const { preference, setThemePreference, theme } = useTheme()
  const resolvedThemeLabel = theme === 'dark' ? 'noche' : 'dia'
  const options = [
    { icon: Sun, label: 'Usar modo dia', preference: 'light' },
    { icon: Monitor, label: `Usar modo automatico (${resolvedThemeLabel})`, preference: 'system' },
    { icon: Moon, label: 'Usar modo noche', preference: 'dark' },
  ] as const

  return (
    <div
      role="group"
      aria-label={`Modo visual actual: ${
        preference === 'system' ? `automatico (${resolvedThemeLabel})` : resolvedThemeLabel
      }`}
      className={cn(
        'grid h-10 w-20 shrink-0 grid-cols-3 items-center overflow-hidden rounded-full border border-onda-purple/20 bg-white/[0.82] p-1 text-onda-purple shadow-[0_0_20px_rgba(123,44,255,0.12)] backdrop-blur-xl transition duration-300 hover:border-onda-purple/45 hover:bg-white sm:h-11 sm:w-[6.25rem] dark:border-onda-lavender/30 dark:bg-white/[0.08] dark:text-onda-lavender dark:shadow-[0_0_20px_rgba(123,44,255,0.18)] dark:hover:border-onda-lavender/50 dark:hover:bg-white/10',
        className,
      )}
    >
      {options.map((option) => {
        const Icon = option.icon
        const isActive = preference === option.preference

        return (
          <button
            key={option.preference}
            type="button"
            onClick={() => setThemePreference(option.preference)}
            aria-pressed={isActive}
            aria-label={option.label}
            title={option.label}
            className={cn(
              'flex h-8 min-w-0 items-center justify-center rounded-full transition duration-300 sm:h-9',
              isActive
                ? 'bg-white text-onda-purple shadow-[0_8px_24px_rgba(123,44,255,0.18)] dark:bg-onda-purple dark:text-white dark:shadow-[0_8px_24px_rgba(123,44,255,0.34)]'
                : 'text-zinc-400 hover:bg-onda-purple/10 hover:text-onda-purple dark:text-white/45 dark:hover:bg-white/10 dark:hover:text-onda-lavender',
            )}
          >
            <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </button>
        )
      })}
    </div>
  )
}
