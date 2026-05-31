import { AnimatePresence, motion } from 'framer-motion'
import { Bot, Send, Sparkles, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useLocation } from 'react-router-dom'
import { useTheme } from '../../lib/theme'
import { cn } from '../../lib/utils'
import { useI18n } from '../../hooks/useI18n'

const robotDaySrc = '/assets/brand/robot-day.png'
const robotNightSrc = '/assets/brand/robot-night.png'

// Reemplazar por el numero oficial de Onda Multimedia con codigo de pais, sin + ni espacios.
const WHATSAPP_NUMBER = '56954546129'

type ChatMessage = {
  id: string
  role: 'assistant' | 'user'
  text: string
}

type QuickOption = {
  label: string
  message: string
}

let messageCounter = 0

function createMessageId(prefix: string) {
  messageCounter += 1
  return `${prefix}-${Date.now()}-${messageCounter}`
}

function buildWhatsappUrl(message: string) {
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`

  return whatsappUrl
}

// sendMessageToAssistant will be created inside the component to access translations

function QuickMessageButton({ option, onSelect }: { option: QuickOption; onSelect: (message: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(option.message)}
      className="rounded-md border border-onda-purple/15 bg-white/64 px-2.5 py-1.5 text-left text-[0.68rem] font-semibold leading-4 text-zinc-700 shadow-[0_10px_24px_rgba(123,44,255,0.07)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-onda-purple/35 hover:bg-onda-purple/10 hover:text-onda-purple hover:shadow-[0_14px_30px_rgba(123,44,255,0.16)] dark:border-white/10 dark:bg-white/[0.06] dark:text-onda-soft dark:hover:border-onda-lavender/35 dark:hover:bg-onda-purple/16 dark:hover:text-white"
    >
      {option.label}
    </button>
  )
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[88%] rounded-lg px-3 py-2 text-xs leading-5 shadow-[0_12px_34px_rgba(24,24,27,0.08)]',
          isUser
            ? 'bg-onda-purple text-white dark:bg-onda-purple'
            : 'border border-onda-purple/12 bg-white/76 text-zinc-700 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.07] dark:text-onda-soft',
        )}
      >
        {message.text}
      </div>
    </div>
  )
}

export default function FloatingAssistant() {
  const { pathname } = useLocation()
  const { theme } = useTheme()
  const { t } = useI18n()
  const desiredSrc = theme === 'dark' ? robotNightSrc : robotDaySrc
  const [isOpen, setIsOpen] = useState(false)
  const [draftMessage, setDraftMessage] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    { id: 'assistant-welcome', role: 'assistant', text: t('assistant.welcome') },
  ])
  const [failedSrcs, setFailedSrcs] = useState<string[]>([])
  const src = failedSrcs.includes(desiredSrc) ? robotDaySrc : desiredSrc
  const useFallbackIcon = failedSrcs.includes(src)
  const handleImageError = () => setFailedSrcs((current) => (current.includes(src) ? current : [...current, src]))

  if (pathname === '/admin/check-in') {
    return null
  }

  const handleQuickOption = (message: string) => {
    setDraftMessage(message)
    setMessages((current) => [
      ...current,
      {
        id: createMessageId('assistant'),
        role: 'assistant',
        text: t('assistant.ready-msg'),
      },
    ])
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const trimmedMessage = draftMessage.trim()

    if (!trimmedMessage) {
      return
    }

    const userMessage: ChatMessage = {
      id: createMessageId('user'),
      role: 'user',
      text: trimmedMessage,
    }
      const assistantMessage = sendMessageToAssistant(trimmedMessage)

    setMessages((current) => [...current, userMessage, assistantMessage])
    setDraftMessage('')
    window.open(buildWhatsappUrl(trimmedMessage), '_blank', 'noopener,noreferrer')
  }

  // build local quick options and initial messages using translations
  const localQuickOptions: QuickOption[] = [
    { label: t('assistant.quick-1'), message: t('assistant.quick-1-msg') },
    { label: t('assistant.quick-2'), message: t('assistant.quick-2-msg') },
    { label: t('assistant.quick-3'), message: t('assistant.quick-3-msg') },
    { label: t('assistant.quick-4'), message: t('assistant.quick-4-msg') },
    { label: t('assistant.quick-5'), message: t('assistant.quick-5-msg') },
  ]

  // runtime sendMessageToAssistant using translations and simple keyword matching (es/en)
  function sendMessageToAssistantRuntime(message: string): ChatMessage {
    const normalized = message.toLowerCase()
    let responseKey = 'assistant.default-response'

    if (/(evento|event)/i.test(normalized)) responseKey = 'assistant.event-response'
    else if (/(audiovisual|audiovisual)/i.test(normalized)) responseKey = 'assistant.audiovisual-response'
    else if (/(representacion|representación|artist|artista)/i.test(normalized)) responseKey = 'assistant.artist-response'
    else if (/(casa|estudio|grabacion|grabación|record)/i.test(normalized)) responseKey = 'assistant.studio-response'
    else if (/(equipo|hablar|team|talk)/i.test(normalized)) responseKey = 'assistant.team-response'

    return { id: createMessageId('assistant'), role: 'assistant', text: t(responseKey) }
  }

  // ensure functions reference the runtime sender
  function sendMessageToAssistant(message: string) {
    return sendMessageToAssistantRuntime(message)
  }

  return (
    <>
      <AnimatePresence>
        {isOpen ? (
          <motion.section
            key="floating-chat-widget"
            role="dialog"
            aria-label={t('assistant.dialog-aria')}
            className="fixed bottom-[6.1rem] right-4 z-50 flex max-h-[75svh] w-[calc(100vw-2rem)] max-w-[22rem] flex-col overflow-hidden rounded-xl border border-onda-purple/18 bg-white/[0.86] text-zinc-950 shadow-[0_28px_90px_rgba(123,44,255,0.2)] backdrop-blur-3xl sm:bottom-[7.3rem] sm:right-7 sm:max-h-[72vh] dark:border-onda-lavender/24 dark:bg-onda-black/[0.78] dark:text-white dark:shadow-[0_28px_100px_rgba(123,44,255,0.34)]"
            initial={{ opacity: 0, y: 22, x: 12, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, x: 10, scale: 0.94 }}
            transition={{ duration: 0.24, ease: 'easeOut' }}
          >
            <div className="pointer-events-none absolute inset-x-8 top-0 h-24 bg-onda-purple/18 blur-3xl dark:bg-onda-purple/28" />
            <header className="relative flex shrink-0 items-center gap-3 border-b border-onda-purple/12 bg-white/52 px-3.5 py-2.5 dark:border-white/10 dark:bg-white/[0.04]">
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-onda-purple/20 bg-white/78 shadow-[0_0_28px_rgba(123,44,255,0.16)] dark:border-onda-lavender/26 dark:bg-white/[0.08]">
                {!useFallbackIcon ? (
                  <img src={src} alt="" className="h-9 w-9 object-contain" onError={handleImageError} />
                ) : (
                  <Bot className="h-5 w-5 text-onda-purple dark:text-onda-lavender" aria-hidden="true" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="truncate font-display text-xs font-extrabold uppercase tracking-[0.13em] text-zinc-950 dark:text-white">
                    {t('assistant.title')}
                  </h2>
                  <Sparkles className="h-3.5 w-3.5 shrink-0 text-onda-purple dark:text-onda-lavender" aria-hidden="true" />
                </div>
                <p className="mt-1 flex items-center gap-2 text-xs font-semibold text-zinc-600 dark:text-onda-muted">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.9)]" />
                  {t('assistant.status')}
                </p>
              </div>
              <button
                type="button"
                aria-label={t('assistant.close-aria')}
                onClick={() => setIsOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-onda-purple/14 bg-white/68 text-zinc-600 transition duration-300 hover:border-onda-purple/32 hover:bg-onda-purple/10 hover:text-onda-purple dark:border-white/10 dark:bg-white/[0.06] dark:text-onda-soft dark:hover:border-onda-lavender/34 dark:hover:bg-white/10 dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="relative min-h-0 flex-1 overflow-y-auto px-3.5 py-3">
              <div className="space-y-2.5 pr-1">
                {messages.map((message) => (
                  <ChatBubble key={message.id} message={message} />
                ))}
              </div>

              <div className="mt-3 grid gap-1.5">
                <p className="font-display text-[0.58rem] font-bold uppercase tracking-[0.16em] text-onda-purple dark:text-onda-lavender">
                  {t('assistant.quick-options')}
                </p>
                <div className="grid gap-1.5">
                  {localQuickOptions.map((option) => (
                    <QuickMessageButton key={option.label} option={option} onSelect={handleQuickOption} />
                  ))}
                </div>
              </div>
            </div>

            <form
              className="relative grid shrink-0 gap-2 border-t border-onda-purple/12 bg-white/50 px-3.5 py-3 dark:border-white/10 dark:bg-white/[0.04]"
              onSubmit={handleSubmit}
            >
              <label htmlFor="onda-assistant-message" className="sr-only">
                {t('assistant.placeholder')}
              </label>
              <textarea
                id="onda-assistant-message"
                aria-label={t('assistant.placeholder')}
                value={draftMessage}
                onChange={(event) => setDraftMessage(event.target.value)}
                placeholder={t('assistant.placeholder')}
                rows={2}
                className="min-h-[3.4rem] resize-none rounded-lg border border-onda-purple/16 bg-white/72 px-3 py-2 text-sm leading-5 text-zinc-800 outline-none shadow-inner shadow-onda-purple/5 backdrop-blur-xl transition focus:border-onda-purple/40 focus:ring-2 focus:ring-onda-purple/12 dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:placeholder:text-onda-muted dark:focus:border-onda-lavender/34"
              />
              <button
                type="submit"
                disabled={!draftMessage.trim()}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-onda-purple/28 bg-onda-purple px-4 py-2.5 font-display text-[0.64rem] font-extrabold uppercase tracking-[0.13em] text-white shadow-[0_0_28px_rgba(123,44,255,0.24)] transition duration-300 hover:-translate-y-0.5 hover:bg-onda-electric hover:shadow-[0_0_38px_rgba(168,85,247,0.36)] disabled:pointer-events-none disabled:opacity-45"
              >
                <Send className="h-4 w-4" aria-hidden="true" />
                {t('assistant.send')}
              </button>
            </form>
          </motion.section>
        ) : null}
      </AnimatePresence>

      <motion.button
        type="button"
        aria-label={isOpen ? t('assistant.close-aria') : t('assistant.open-aria')}
        onClick={() => setIsOpen((current) => !current)}
        className="group fixed bottom-5 right-5 z-50 flex h-[4.8rem] w-[4.8rem] items-center justify-center transition duration-300 sm:bottom-7 sm:right-7 sm:h-24 sm:w-24"
        animate={{ y: [0, -8, 0] }}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.96 }}
        transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <span className="pointer-events-none absolute inset-x-2 bottom-1 h-7 rounded-[999px] bg-onda-purple/20 blur-xl transition duration-300 group-hover:bg-onda-electric/28 dark:bg-onda-purple/28" />
        {!isOpen ? (
          <span className="pointer-events-none absolute bottom-full right-0 mb-3 w-max max-w-[220px] rounded-md border border-onda-purple/12 bg-white/88 px-3 py-2 text-xs font-semibold text-zinc-800 opacity-0 shadow-[0_16px_50px_rgba(123,44,255,0.16)] backdrop-blur-xl transition duration-300 group-hover:translate-y-[-2px] group-hover:opacity-100 dark:border-white/16 dark:bg-black/78 dark:text-white">
            {t('assistant.tooltip')}
          </span>
        ) : null}
        {!useFallbackIcon ? (
          <img
            src={src}
            alt={t('assistant.robot-alt')}
            className="relative h-[4.4rem] w-auto object-contain drop-shadow-[0_16px_30px_rgba(123,44,255,0.34)] transition duration-300 group-hover:drop-shadow-[0_18px_40px_rgba(168,85,247,0.48)] sm:h-[5.7rem]"
            onError={handleImageError}
          />
        ) : (
          <Bot
            className="relative h-10 w-10 text-onda-purple drop-shadow-[0_12px_28px_rgba(123,44,255,0.34)] dark:text-onda-lavender"
            aria-hidden="true"
          />
        )}
      </motion.button>
    </>
  )
}
