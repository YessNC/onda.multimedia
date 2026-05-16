import { motion } from 'framer-motion'
import { ArrowRight, Play } from 'lucide-react'
import { useState } from 'react'
import CTAButton from '../shared/CTAButton'

export type HeroSlideProps = {
  description: string
  eyebrow: string
  image: string
  title: string
}

export default function HeroSlide({ description, eyebrow, image, title }: HeroSlideProps) {
  const [missingImage, setMissingImage] = useState<string | null>(null)
  const isMissing = missingImage === image

  return (
    <section className="relative min-h-[82vh] overflow-hidden">
      {!isMissing ? (
        <img
          src={image}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setMissingImage(image)}
        />
      ) : (
        <div className="tech-grid absolute inset-0" />
      )}
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.94),rgba(255,255,255,0.64),rgba(255,255,255,0.18))] dark:bg-[linear-gradient(90deg,rgba(5,5,5,0.96),rgba(5,5,5,0.72),rgba(123,44,255,0.18))]" />
      <div className="absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(0deg,rgba(255,255,255,1),transparent)] dark:bg-[linear-gradient(0deg,rgba(5,5,5,1),transparent)]" />

      <div className="onda-container relative z-10 flex min-h-[82vh] items-center py-20">
        <motion.div
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="max-w-3xl"
        >
          <p className="font-display text-xs font-bold uppercase tracking-[0.32em] text-onda-purple dark:text-onda-lavender">
            {eyebrow}
          </p>
          <h1 className="mt-5 font-display text-4xl font-extrabold uppercase leading-tight tracking-[0.12em] text-zinc-950 sm:text-6xl dark:text-white">
            {title}
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-zinc-600 sm:text-lg dark:text-onda-muted">
            {description}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <CTAButton to="/contacto" icon={<ArrowRight className="h-4 w-4" />}>
              Cotiza tu proyecto
            </CTAButton>
            <CTAButton to="/eventos" variant="secondary" icon={<Play className="h-4 w-4" />}>
              Ver eventos
            </CTAButton>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
