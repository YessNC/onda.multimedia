import { motion } from 'framer-motion'
import { Bot } from 'lucide-react'
import { useState } from 'react'
import { useTheme } from '../../lib/theme'
import { whatsappQuoteUrl } from '../../lib/utils'

export default function FloatingAssistant() {
  const { theme } = useTheme()
  const [missingSrc, setMissingSrc] = useState<string | null>(null)
  const src = theme === 'dark' ? '/assets/brand/robot-night.png' : '/assets/brand/robot-day.png'
  const isMissing = missingSrc === src

  return (
    <motion.a
      href={whatsappQuoteUrl}
      target="_blank"
      rel="noreferrer"
      aria-label="Abrir WhatsApp para cotizar un proyecto con Onda Multimedia"
      className="group fixed bottom-5 right-5 z-50 flex h-16 w-16 items-center justify-center rounded-full border border-onda-lavender/40 bg-white/80 shadow-[0_0_34px_rgba(157,78,221,0.5)] backdrop-blur-xl transition hover:scale-105 dark:bg-onda-night/82 sm:bottom-7 sm:right-7 sm:h-20 sm:w-20"
      animate={{ y: [0, -8, 0] }}
      transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
    >
      <span className="pointer-events-none absolute bottom-full right-0 mb-3 w-max max-w-[220px] rounded-md border border-onda-purple/20 bg-white px-3 py-2 text-xs font-semibold text-zinc-800 opacity-0 shadow-xl transition group-hover:opacity-100 dark:bg-onda-night dark:text-onda-soft">
        ¿Hablamos de tu proyecto?
      </span>
      {!isMissing ? (
        <img
          src={src}
          alt="Asistente de ONDA MULTIMEDIA"
          className="h-12 w-12 rounded-full object-cover sm:h-16 sm:w-16"
          onError={() => setMissingSrc(src)}
        />
      ) : (
        <Bot className="h-8 w-8 text-onda-purple dark:text-onda-lavender" aria-hidden="true" />
      )}
    </motion.a>
  )
}
