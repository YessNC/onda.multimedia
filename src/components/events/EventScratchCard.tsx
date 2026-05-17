import { Sparkles } from 'lucide-react'
import GlowCard from '../shared/GlowCard'
import { useI18n } from '../../hooks/useI18n'

export default function EventScratchCard() {
  const { t } = useI18n()

  return (
    <GlowCard className="mt-10 grid gap-4 border-dashed border-onda-purple/35 text-center">
      <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-md bg-onda-purple/10 text-onda-purple dark:bg-onda-purple/20 dark:text-onda-lavender">
        <Sparkles className="h-5 w-5" aria-hidden="true" />
      </div>
      <div>
        <h3 className="font-display text-lg font-bold uppercase tracking-[0.16em] text-zinc-950 dark:text-white">
          {t('event.scratch-title')}
        </h3>
        <p className="mt-2 text-sm leading-7 text-zinc-600 dark:text-onda-muted">
          {t('event.scratch-desc')}
        </p>
      </div>
    </GlowCard>
  )
}
