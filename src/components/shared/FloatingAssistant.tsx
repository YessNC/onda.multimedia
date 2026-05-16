import { motion } from 'framer-motion'
import { Bot } from 'lucide-react'
import { useState } from 'react'
import { useTheme } from '../../lib/theme'
import { whatsappQuoteUrl } from '../../lib/utils'

const robotDaySrc = '/assets/brand/robot-day.png'
const robotNightSrc = '/assets/brand/robot-night.png'

export default function FloatingAssistant() {
  const { theme } = useTheme()
  const desiredSrc = theme === 'dark' ? robotNightSrc : robotDaySrc
  const [failedSrcs, setFailedSrcs] = useState<string[]>([])
  const src = failedSrcs.includes(desiredSrc) ? robotDaySrc : desiredSrc
  const useFallbackIcon = failedSrcs.includes(src)
  const handleImageError = () => setFailedSrcs((current) => (current.includes(src) ? current : [...current, src]))

  return (
    <motion.a
      href={whatsappQuoteUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Abrir WhatsApp para cotizar un proyecto con Onda Multimedia"
      className="group fixed bottom-5 right-5 z-50 flex h-[4.8rem] w-[4.8rem] items-center justify-center transition duration-300 hover:scale-[1.06] sm:bottom-7 sm:right-7 sm:h-24 sm:w-24"
      animate={{ y: [0, -8, 0] }}
      transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
    >
      <span className="pointer-events-none absolute inset-x-2 bottom-1 h-7 rounded-[999px] bg-onda-purple/20 blur-xl transition duration-300 group-hover:bg-onda-electric/28" />
      <span className="pointer-events-none absolute bottom-full right-0 mb-3 w-max max-w-[220px] rounded-md border border-white/16 bg-black/78 px-3 py-2 text-xs font-semibold text-white opacity-0 shadow-[0_16px_50px_rgba(0,0,0,0.34)] backdrop-blur-xl transition duration-300 group-hover:translate-y-[-2px] group-hover:opacity-100 dark:bg-white/10">
        ¿Hablamos de tu proyecto?
      </span>
      {!useFallbackIcon ? (
        <img
          src={src}
          alt="Asistente de ONDA MULTIMEDIA"
          className="relative h-[4.4rem] w-auto object-contain drop-shadow-[0_16px_30px_rgba(123,44,255,0.34)] transition duration-300 group-hover:drop-shadow-[0_18px_40px_rgba(168,85,247,0.48)] sm:h-[5.7rem]"
          onError={handleImageError}
        />
      ) : (
        <Bot
          className="relative h-10 w-10 text-onda-purple drop-shadow-[0_12px_28px_rgba(123,44,255,0.34)] dark:text-onda-lavender"
          aria-hidden="true"
        />
      )}
    </motion.a>
  )
}
