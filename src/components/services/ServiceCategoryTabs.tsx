import { useState } from 'react'
import { serviceCategories } from '../../data/services'
import { cn } from '../../lib/utils'
import ServiceAccordion from './ServiceAccordion'

export default function ServiceCategoryTabs() {
  const [activeCategoryId, setActiveCategoryId] = useState(serviceCategories[0].id)
  const activeCategory = serviceCategories.find((category) => category.id === activeCategoryId) ?? serviceCategories[0]
  const ActiveIcon = activeCategory.icon

  return (
    <section className="py-20">
      <div className="onda-container">
        <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="grid gap-3">
            {serviceCategories.map((category) => {
              const Icon = category.icon
              const isActive = activeCategory.id === category.id

              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setActiveCategoryId(category.id)}
                  className={cn(
                    'glass-panel flex items-center gap-4 rounded-lg p-4 text-left transition hover:border-onda-purple/45',
                    isActive && 'border-onda-purple/55 shadow-[0_0_34px_rgba(123,44,255,0.18)]',
                  )}
                >
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-onda-purple/10 text-onda-purple dark:bg-onda-purple/20 dark:text-onda-lavender">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block font-display text-sm font-bold uppercase tracking-[0.16em] text-zinc-950 dark:text-white">
                      {category.label}
                    </span>
                    <span className="mt-1 block text-sm text-zinc-600 dark:text-onda-muted">{category.description}</span>
                  </span>
                </button>
              )
            })}
          </div>

          <div className="glass-panel rounded-lg p-5">
            <div className="mb-6 flex items-start gap-4">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-md bg-onda-purple text-white">
                <ActiveIcon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="font-display text-xl font-extrabold uppercase tracking-[0.14em] text-zinc-950 dark:text-white">
                  {activeCategory.label}
                </h2>
                <p className="mt-2 text-sm leading-7 text-zinc-600 dark:text-onda-muted">{activeCategory.description}</p>
              </div>
            </div>
            <ServiceAccordion services={activeCategory.services} />
          </div>
        </div>
      </div>
    </section>
  )
}
