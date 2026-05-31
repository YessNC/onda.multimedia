import { Camera } from 'lucide-react'
import { useState } from 'react'
import { cn } from '../../lib/utils'

type EventPosterFrameProps = {
  alt: string
  className?: string
  imageClassName?: string
  src: string
}

export default function EventPosterFrame({ alt, className, imageClassName, src }: EventPosterFrameProps) {
  const [missingSrc, setMissingSrc] = useState<string | null>(null)
  const isMissing = !src || missingSrc === src

  return (
    <div
      className={cn(
        'relative isolate overflow-hidden rounded-lg border border-onda-lavender/25 bg-onda-black shadow-[0_24px_70px_rgba(5,5,5,0.28)]',
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(145deg,rgba(5,5,5,0.98),rgba(33,18,65,0.8)_55%,rgba(123,44,255,0.28))]"
      />
      {!isMissing ? (
        <img
          src={src}
          alt={alt}
          className={cn('relative z-10 h-full w-full object-contain p-2', imageClassName)}
          onError={() => setMissingSrc(src)}
        />
      ) : (
        <div className="tech-grid relative z-10 flex h-full min-h-72 w-full items-center justify-center p-6">
          <div className="grid justify-items-center gap-3 text-center">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-md border border-onda-lavender/30 bg-onda-black/65 text-onda-lavender shadow-[0_0_28px_rgba(123,44,255,0.24)]">
              <Camera className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="font-display text-xs font-bold uppercase tracking-[0.18em] text-onda-soft">
              Flyer en preparación
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
