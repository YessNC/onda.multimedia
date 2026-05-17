import { ArrowUpRight, CalendarCheck, MapPin } from 'lucide-react'
import CTAButton from '../shared/CTAButton'
import ScratchImageCard from './ScratchImageCard'
import { useI18n } from '../../hooks/useI18n'

const casaMatrizAssets = [
  {
    alt: 'casamatriz.img-1-alt',
    className: 'aspect-[4/5] sm:aspect-auto sm:row-span-2',
    src: '/assets/casa-matriz/casa-matriz-01.webp',
  },
  {
    alt: 'casamatriz.img-2-alt',
    className: 'aspect-[4/3] sm:aspect-auto',
    src: '/assets/casa-matriz/casa-matriz-02.webp',
  },
  {
    alt: 'casamatriz.img-3-alt',
    className: 'aspect-[4/3] sm:aspect-auto',
    src: '/assets/casa-matriz/casa-matriz-03.webp',
  },
  {
    alt: 'casamatriz.img-4-alt',
    className: 'aspect-[4/5] sm:aspect-auto sm:row-span-2',
    src: '/assets/casa-matriz/casa-matriz-04.webp',
  },
  {
    alt: 'casamatriz.img-5-alt',
    className: 'aspect-[4/3] sm:aspect-auto',
    src: '/assets/casa-matriz/estudio-01.webp',
  },
  {
    alt: 'casamatriz.img-6-alt',
    className: 'aspect-[4/3] sm:aspect-auto',
    src: '/assets/casa-matriz/estudio-02.webp',
  },
  {
    alt: 'casamatriz.img-7-alt',
    className: 'aspect-[4/3] sm:aspect-auto',
    src: '/assets/casa-matriz/grabacion-01.webp',
  },
  {
    alt: 'casamatriz.img-8-alt',
    className: 'aspect-[4/3] sm:aspect-auto',
    src: '/assets/casa-matriz/evento-01.webp',
  },
]

export default function CasaMatrizSection() {
  const { t } = useI18n()

  return (
    <section id="casa-matriz" className="relative isolate overflow-hidden py-20 sm:py-24">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-6 -z-10 h-72 w-[min(42rem,85vw)] -translate-x-1/2 rounded-full bg-onda-purple/20 blur-3xl dark:bg-onda-purple/24"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-1/2 -z-10 h-px bg-gradient-to-r from-transparent via-onda-lavender/35 to-transparent"
      />

      <div className="onda-container">
        <div className="grid gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
          <div className="relative">
            <div className="glass-panel rounded-lg p-6 sm:p-8 lg:p-9">
              <p className="mb-4 inline-flex items-center gap-2 font-display text-xs font-bold uppercase tracking-[0.26em] text-onda-purple dark:text-onda-lavender">
                <MapPin className="h-4 w-4" aria-hidden="true" />
                {t('casamatriz.eyebrow')}
              </p>

              <h2 className="max-w-xl font-display text-3xl font-extrabold uppercase tracking-[0.1em] text-zinc-950 sm:text-4xl dark:text-white">
                {t('casamatriz.title')}
              </h2>

              <p className="mt-5 max-w-xl text-lg font-semibold leading-8 text-zinc-700 dark:text-onda-soft">
                {t('casamatriz.subtitle')}
              </p>

              <p className="mt-5 max-w-xl text-sm leading-7 text-zinc-600 dark:text-onda-muted sm:text-base sm:leading-8">
                {t('casamatriz.description')}
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <CTAButton
                  href="#casa-matriz-galeria"
                  icon={<ArrowUpRight className="h-4 w-4" aria-hidden="true" />}
                  className="w-full border border-onda-lavender/35 bg-[linear-gradient(135deg,rgba(123,44,255,0.78),rgba(192,132,252,0.2))] shadow-[0_0_32px_rgba(123,44,255,0.32)] backdrop-blur-xl sm:w-auto"
                >
                  {t('casamatriz.cta-studio')}
                </CTAButton>
                <CTAButton
                  to="/contacto"
                  variant="secondary"
                  icon={<CalendarCheck className="h-4 w-4" aria-hidden="true" />}
                  className="w-full border-onda-lavender/30 bg-white/60 shadow-[0_0_28px_rgba(123,44,255,0.12)] backdrop-blur-xl dark:bg-white/10 sm:w-auto"
                >
                  {t('casamatriz.cta-visit')}
                </CTAButton>
              </div>
            </div>
          </div>

          <div id="casa-matriz-galeria" className="relative">
            <div
              aria-hidden="true"
              className="absolute -inset-4 rounded-[2rem] border border-onda-lavender/10 bg-onda-purple/10 blur-2xl dark:bg-onda-purple/15"
            />
            <div className="relative grid grid-cols-1 gap-3 sm:auto-rows-[9.6rem] sm:grid-cols-2 lg:auto-rows-[8.8rem] xl:auto-rows-[10rem]">
              {casaMatrizAssets.map((asset) => (
                <ScratchImageCard key={asset.src} src={asset.src} alt={t(asset.alt)} className={asset.className} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
