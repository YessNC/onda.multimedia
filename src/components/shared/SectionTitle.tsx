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
        <p className="mb-3 font-display text-xs font-bold uppercase tracking-[0.28em] text-onda-purple dark:text-onda-lavender">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="font-display text-3xl font-extrabold uppercase tracking-[0.12em] text-zinc-950 sm:text-4xl dark:text-white">
        {title}
      </h2>
      {subtitle ? (
        <p className="mt-4 text-base leading-7 text-zinc-600 dark:text-onda-muted">{subtitle}</p>
      ) : null}
    </div>
  )
}
