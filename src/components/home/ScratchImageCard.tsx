import { Hand, Sparkles } from 'lucide-react'
import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'
import { cn } from '../../lib/utils'
import { useI18n } from '../../hooks/useI18n' 

type ScratchImageCardProps = {
  alt: string
  className?: string
  src: string
}

type ScratchPoint = {
  x: number
  y: number
}

const getBrushSize = (width: number, height: number) => Math.max(58, Math.min(92, Math.min(width, height) * 0.3))

const paintScratchCover = (context: CanvasRenderingContext2D, width: number, height: number, scale: number) => {
  context.clearRect(0, 0, width, height)
  context.globalCompositeOperation = 'source-over'

  const base = context.createLinearGradient(0, 0, width, height)
  base.addColorStop(0, 'rgba(7, 5, 16, 0.97)')
  base.addColorStop(0.42, 'rgba(48, 23, 84, 0.9)')
  base.addColorStop(1, 'rgba(14, 7, 31, 0.95)')
  context.fillStyle = base
  context.fillRect(0, 0, width, height)

  const topGlow = context.createRadialGradient(width * 0.16, height * 0.22, 0, width * 0.16, height * 0.22, width * 0.58)
  topGlow.addColorStop(0, 'rgba(192, 132, 252, 0.34)')
  topGlow.addColorStop(1, 'rgba(192, 132, 252, 0)')
  context.fillStyle = topGlow
  context.fillRect(0, 0, width, height)

  const bottomGlow = context.createRadialGradient(width * 0.82, height * 0.82, 0, width * 0.82, height * 0.82, width * 0.62)
  bottomGlow.addColorStop(0, 'rgba(123, 44, 255, 0.32)')
  bottomGlow.addColorStop(1, 'rgba(123, 44, 255, 0)')
  context.fillStyle = bottomGlow
  context.fillRect(0, 0, width, height)

  context.save()
  context.lineWidth = Math.max(1, scale)
  context.strokeStyle = 'rgba(192, 132, 252, 0.13)'
  for (let lineX = -height; lineX < width + height; lineX += 18 * scale) {
    context.beginPath()
    context.moveTo(lineX, height)
    context.lineTo(lineX + height * 0.72, 0)
    context.stroke()
  }

  context.strokeStyle = 'rgba(255, 255, 255, 0.055)'
  for (let lineY = 0; lineY < height; lineY += 11 * scale) {
    context.beginPath()
    context.moveTo(0, lineY)
    context.lineTo(width, lineY)
    context.stroke()
  }
  context.restore()

  const shine = context.createLinearGradient(width * 0.08, 0, width * 0.92, height)
  shine.addColorStop(0, 'rgba(255, 255, 255, 0)')
  shine.addColorStop(0.46, 'rgba(255, 255, 255, 0.16)')
  shine.addColorStop(0.64, 'rgba(255, 255, 255, 0)')
  context.fillStyle = shine
  context.fillRect(0, 0, width, height)

  context.strokeStyle = 'rgba(255, 255, 255, 0.1)'
  context.lineWidth = Math.max(1, scale)
  context.strokeRect(scale * 0.5, scale * 0.5, width - scale, height - scale)
}

export default function ScratchImageCard({ alt, className, src }: ScratchImageCardProps) {
  const cardRef = useRef<HTMLButtonElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const activePointerIdRef = useRef<number | null>(null)
  const hasScratchedRef = useRef(false)
  const lastPointRef = useRef<ScratchPoint | null>(null)
  const [isMissing, setIsMissing] = useState(false)
  const [hasScratched, setHasScratched] = useState(false)
  const { t } = useI18n()

  const drawCover = useCallback(() => {
    const canvas = canvasRef.current
    const card = cardRef.current

    if (!canvas || !card) return

    const rect = card.getBoundingClientRect()
    const scale = Math.min(window.devicePixelRatio || 1, 2)
    const width = Math.max(1, Math.round(rect.width * scale))
    const height = Math.max(1, Math.round(rect.height * scale))

    canvas.width = width
    canvas.height = height
    canvas.style.width = `${rect.width}px`
    canvas.style.height = `${rect.height}px`

    const context = canvas.getContext('2d')
    if (!context) return

    paintScratchCover(context, width, height, scale)
    hasScratchedRef.current = false
    lastPointRef.current = null
    setHasScratched(false)
  }, [])

  useLayoutEffect(() => {
    drawCover()

    const card = cardRef.current
    if (!card) return undefined

    const observer = new ResizeObserver(drawCover)
    observer.observe(card)

    return () => observer.disconnect()
  }, [drawCover])

  const getCanvasPoint = (event: PointerEvent<HTMLButtonElement>): ScratchPoint | null => {
    const canvas = canvasRef.current

    if (!canvas) return null

    const rect = canvas.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * canvas.width
    const y = ((event.clientY - rect.top) / rect.height) * canvas.height

    return {
      x: Math.min(canvas.width, Math.max(0, x)),
      y: Math.min(canvas.height, Math.max(0, y)),
    }
  }

  const scratchAt = (point: ScratchPoint, previousPoint = lastPointRef.current) => {
    const canvas = canvasRef.current

    if (!canvas) return

    const context = canvas.getContext('2d')
    const rect = canvas.getBoundingClientRect()

    if (!context || rect.width <= 0 || rect.height <= 0) return

    const brushSize = getBrushSize(rect.width, rect.height) * (canvas.width / rect.width)

    context.save()
    context.globalCompositeOperation = 'destination-out'
    context.lineCap = 'round'
    context.lineJoin = 'round'
    context.strokeStyle = 'rgba(0, 0, 0, 1)'
    context.fillStyle = 'rgba(0, 0, 0, 1)'

    if (previousPoint) {
      context.lineWidth = brushSize
      context.beginPath()
      context.moveTo(previousPoint.x, previousPoint.y)
      context.lineTo(point.x, point.y)
      context.stroke()
    }

    context.beginPath()
    context.arc(point.x, point.y, brushSize * 0.5, 0, Math.PI * 2)
    context.fill()
    context.restore()

    lastPointRef.current = point

    if (!hasScratchedRef.current) {
      hasScratchedRef.current = true
      setHasScratched(true)
    }
  }

  const scratchCenter = () => {
    const canvas = canvasRef.current

    if (!canvas) return

    scratchAt({
      x: canvas.width * 0.5,
      y: canvas.height * 0.5,
    })
  }

  const handlePointerLeave = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === 'mouse') {
      lastPointRef.current = null
    }
  }

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    const point = getCanvasPoint(event)

    if (!point) return

    lastPointRef.current = point

    if (event.pointerType !== 'mouse') {
      activePointerIdRef.current = event.pointerId
      event.currentTarget.setPointerCapture(event.pointerId)
      scratchAt(point, null)
    }
  }

  const handlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const point = getCanvasPoint(event)

    if (!point) return

    if (event.pointerType === 'mouse') {
      scratchAt(point)
      return
    }

    if (activePointerIdRef.current === event.pointerId) {
      scratchAt(point)
    }
  }

  const handlePointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    if (activePointerIdRef.current !== event.pointerId) return

    activePointerIdRef.current = null
    lastPointRef.current = null

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return

    event.preventDefault()
    scratchCenter()
  }

  return (
    <button
      ref={cardRef}
      type="button"
      aria-label={`${t('scratch.image-aria')} ${alt}`}
      className={cn(
        'group/scratch relative block h-full min-h-56 w-full touch-none appearance-none overflow-hidden rounded-lg border border-onda-lavender/20 bg-onda-black/80 p-0 text-left outline-none',
        'shadow-[0_18px_46px_rgba(5,5,5,0.18),0_0_34px_rgba(123,44,255,0.16)] transition duration-300',
        'focus-visible:border-onda-lavender focus-visible:ring-2 focus-visible:ring-onda-lavender/55',
        className,
      )}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerCancel={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
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

      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full rounded-[inherit]"
      />

      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute inset-4 flex items-center justify-center transition duration-500',
          hasScratched && 'translate-y-2 opacity-0',
        )}
      >
        <span className="inline-flex max-w-[11rem] flex-col items-center gap-2 rounded-md border border-white/15 bg-onda-black/48 px-4 py-3 text-center text-onda-soft shadow-[0_0_28px_rgba(168,85,247,0.28)] backdrop-blur-xl">
          <Hand className="h-5 w-5 text-onda-lavender" />
          <span className="font-display text-[0.62rem] font-bold uppercase leading-5 tracking-[0.16em]">
            {t('scratch.discover')}
          </span>
        </span>
      </div>
    </button>
  )
}
