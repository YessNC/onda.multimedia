import type { LucideIcon } from 'lucide-react'
import { cn } from '../../lib/utils'

export interface DashboardStat {
  label: string
  value: number
  icon: LucideIcon
  tone: string
}

interface StatsCardsProps {
  stats: DashboardStat[]
}

export default function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-3">
      {stats.map((stat) => {
        const Icon = stat.icon

        return (
          <div key={stat.label} className="glass-panel rounded-lg p-4 transition duration-300 hover:-translate-y-0.5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500 dark:text-onda-muted">
                  {stat.label}
                </p>
                <p className="mt-2 font-display text-2xl font-extrabold text-zinc-950 dark:text-white">
                  {stat.value}
                </p>
              </div>
              <span
                className={cn(
                  'inline-flex h-11 w-11 items-center justify-center rounded-md bg-white/75 dark:bg-white/10',
                  stat.tone,
                )}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
