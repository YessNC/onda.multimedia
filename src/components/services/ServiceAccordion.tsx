import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import type { Service } from '../../data/services'
import { cn } from '../../lib/utils'
import { useI18n } from '../../hooks/useI18n'

type ServiceAccordionProps = {
  services: Service[]
}

export default function ServiceAccordion({ services }: ServiceAccordionProps) {
  const { t } = useI18n()
  const [openServiceId, setOpenServiceId] = useState(services[0]?.id)

  return (
    <div className="grid gap-3">
      {services.map((service) => {
        const isOpen = openServiceId === service.id

        return (
          <article key={service.id} className="rounded-lg border border-onda-purple/15 bg-white/55 dark:bg-white/5">
            <button
              type="button"
              onClick={() => setOpenServiceId(isOpen ? '' : service.id)}
              className="flex w-full items-center justify-between gap-4 p-4 text-left"
            >
              <span className="font-display text-sm font-bold uppercase tracking-[0.14em] text-zinc-950 dark:text-white">
                {t(service.titleKey)}
              </span>
              <ChevronDown className={cn('h-5 w-5 text-onda-purple transition', isOpen && 'rotate-180')} />
            </button>
            {isOpen ? (
              <p className="border-t border-onda-purple/10 px-4 pb-4 pt-3 text-sm leading-7 text-zinc-600 dark:text-onda-muted">
                {t(service.summaryKey)}
              </p>
            ) : null}
          </article>
        )
      })}
    </div>
  )
}
