import { ScanSearch, Sparkles } from 'lucide-react'
import { useRef, useState } from 'react'
import type { CSSProperties, PointerEvent } from 'react'
import { cn } from '../../lib/utils'

type ScratchImageCardProps = {
  alt: string
  className?: string
  src: string
}

type ScratchOverlayStyle = CSSProperties & {
  '--scratch-reveal': string
  '--scratch-x': string
  '--scratch-y': string
}

export default function ScratchImageCard({ alt, className, src }: ScratchImageCardProps) {
  const cardRef = useRef<HTMLButtonElement>(null)
  const lastPointerType = useRef<string | null>(null)
  const [isMissing, setIsMissing] = useState(false)
  const [isRevealed, setIsRevealed] = useState(false)
  const [position, setPosition] = useState({ x: 50, y: 50 })
  const [revealRadius, setRevealRadius] = useState(720)

  const updateRevealOrigin = (event?: PointerEvent<HTMLButtonElement>) => {
    const card = cardRef.current
    if (!card) return

    const rect = card.getBoundingClientRect()
    const x = event ? ((event.clientX - rect.left) / rect.width) * 100 : 50
    const y = event ? ((event.clientY - rect.top) / rect.height) * 100 : 50

    setPosition({
      x: Math.min(100, Math.max(0, x)),
      y: Math.min(100, Math.max(0, y)),
    })
    setRevealRadius(Math.ceil(Math.hypot(rect.width, rect.height) * 1.22))
  }

  const handlePointerEnter = (event: PointerEvent<HTMLButtonElement>) => {
    lastPointerType.current = event.pointerType
    if (event.pointerType !== 'mouse') return

    updateRevealOrigin(event)
    setIsRevealed(true)
  }

  const handlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    lastPointerType.current = event.pointerType
    if (event.pointerType !== 'mouse') return

    updateRevealOrigin(event)
    setIsRevealed(true)
  }

  const handlePointerLeave = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === 'mouse') {
      setIsRevealed(false)
    }
  }

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    lastPointerType.current = event.pointerType
    updateRevealOrigin(event)
  }

  const handleClick = () => {
    if (lastPointerType.current === 'mouse') return

    updateRevealOrigin()
    setIsRevealed((current) => !current)
  }

  const overlayStyle: ScratchOverlayStyle = {
    '--scratch-reveal': isRevealed ? `${revealRadius}px` : '0px',
    '--scratch-x': `${position.x}%`,
    '--scratch-y': `${position.y}%`,
  }

  return (
    <button
      ref={cardRef}
      type="button"
      aria-label={`Descubrir imagen: ${alt}`}
      className={cn(
        'group/scratch relative block h-full min-h-56 w-full appearance-none overflow-hidden rounded-lg border border-onda-lavender/20 bg-onda-black/80 p-0 text-left outline-none',
        'shadow-[0_18px_46px_rgba(5,5,5,0.18),0_0_34px_rgba(123,44,255,0.16)] transition duration-300',
        'focus-visible:border-onda-lavender focus-visible:ring-2 focus-visible:ring-onda-lavender/55',
        className,
      )}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onPointerMove={handlePointerMove}
    >
      {!isMissing ? (
        <img
          src={src}
          alt={alt}
          className="h-full w-full select-none object-cover transition duration-700 group-hover/scratch:scale-[1.035]"
          draggable={false}
          onError={() => setIsMissing(true)}
        />
      ) : (
        <div className="tech-grid flex h-full w-full items-center justify-center bg-onda-night">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-md border border-onda-lavender/35 bg-white/10 text-onda-lavender shadow-[0_0_32px_rgba(168,85,247,0.28)] backdrop-blur-xl">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </div>
        </div>
      )}

      <div
        aria-hidden="true"
        className="scratch-reveal-overlay pointer-events-none absolute inset-0 border border-white/10 backdrop-blur-xl"
        style={overlayStyle}
      />

      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute left-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/15 bg-onda-black/35 text-onda-soft shadow-[0_0_22px_rgba(168,85,247,0.26)] backdrop-blur-xl transition duration-300',
          isRevealed && 'scale-90 opacity-0',
        )}
      >
        <ScanSearch className="h-4 w-4" />
      </div>
    </button>
  )
}
