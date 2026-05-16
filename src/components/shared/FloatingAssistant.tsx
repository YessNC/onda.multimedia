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
      rel="noreferrer"
      aria-label="Abrir WhatsApp para cotizar un proyecto con Onda Multimedia"
      className="group fixed bottom-5 right-5 z-50 flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full border border-white/20 bg-white/16 shadow-[0_0_34px_rgba(123,44,255,0.28)] backdrop-blur-2xl transition duration-300 hover:scale-[1.04] hover:border-onda-lavender/45 hover:shadow-[0_0_46px_rgba(168,85,247,0.38)] sm:bottom-7 sm:right-7 sm:h-24 sm:w-24 dark:border-onda-lavender/20 dark:bg-onda-night/58"
      animate={{ y: [0, -8, 0] }}
      transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
    >
      <span className="pointer-events-none absolute inset-0 rounded-full border border-onda-purple/25 opacity-90 shadow-[inset_0_0_20px_rgba(255,255,255,0.08),0_0_24px_rgba(157,78,221,0.2)]" />
      <span className="pointer-events-none absolute -inset-2 rounded-full bg-onda-purple/12 blur-xl transition duration-300 group-hover:bg-onda-electric/18" />
      <span className="pointer-events-none absolute bottom-full right-0 mb-3 w-max max-w-[220px] rounded-md border border-white/16 bg-black/78 px-3 py-2 text-xs font-semibold text-white opacity-0 shadow-[0_16px_50px_rgba(0,0,0,0.34)] backdrop-blur-xl transition duration-300 group-hover:translate-y-[-2px] group-hover:opacity-100 dark:bg-white/10">
        ¿Hablamos de tu proyecto?
      </span>
      {!useFallbackIcon ? (
        <img
          src={src}
          alt="Asistente de ONDA MULTIMEDIA"
          className="relative h-14 w-14 object-contain drop-shadow-[0_14px_30px_rgba(123,44,255,0.36)] sm:h-20 sm:w-20"
          onError={handleImageError}
        />
      ) : (
        <Bot className="relative h-8 w-8 text-onda-purple dark:text-onda-lavender" aria-hidden="true" />
      )}
    </motion.a>
  )
}
