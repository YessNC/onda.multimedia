import { Sparkles } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { cn } from '../../lib/utils'

type AssetFrameProps = {
  alt: string
  children?: ReactNode
  className?: string
  imageClassName?: string
  src: string
}

export default function AssetFrame({ alt, children, className, imageClassName, src }: AssetFrameProps) {
  const [missingSrc, setMissingSrc] = useState<string | null>(null)
  const isMissing = !src || missingSrc === src

  return (
    <div className={cn('relative overflow-hidden rounded-lg border border-onda-purple/20 bg-white/60 dark:bg-white/5', className)}>
      {!isMissing ? (
        <img
          src={src}
          alt={alt}
          className={cn('absolute inset-0 h-full w-full object-cover', imageClassName)}
          onError={() => setMissingSrc(src)}
        />
      ) : (
        <div className="tech-grid absolute inset-0 flex h-full min-h-56 w-full items-center justify-center">
          <div className="rounded-md border border-onda-lavender/30 bg-white/55 p-4 text-onda-purple shadow-[0_0_28px_rgba(123,44,255,0.18)] dark:bg-onda-black/55 dark:text-onda-lavender">
            <Sparkles className="h-6 w-6" aria-hidden="true" />
          </div>
        </div>
      )}
      {children}
    </div>
  )
}
