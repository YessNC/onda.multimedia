import { cn } from '../../lib/utils'

type SectionTitleProps = {
  align?: 'left' | 'center'
  eyebrow?: string
  subtitle?: string
  title: string
}

export default function SectionTitle({ align = 'left', eyebrow, subtitle, title }: SectionTitleProps) {
  return (
    <div className={cn('max-w-3xl', align === 'center' && 'mx-auto text-center')}>
      {eyebrow ? (
        <p className="mb-3 inline-flex items-center gap-2 font-display text-xs font-bold uppercase tracking-[0.3em] text-onda-purple dark:text-onda-lavender">
          <span className="h-px w-8 bg-onda-purple opacity-70" />
          {eyebrow}
        </p>
      ) : null}
      <h2 className="font-display text-3xl font-extrabold uppercase tracking-[0.12em] text-zinc-950 drop-shadow-[0_4px_20px_rgba(0,0,0,0.08)] sm:text-4xl dark:text-white">
        {title}
      </h2>
      {subtitle ? (
        <p className="mt-5 max-w-2xl text-base leading-8 text-zinc-600 dark:text-onda-muted sm:text-lg">{subtitle}</p>
      ) : null}
    </div>
  )
}
