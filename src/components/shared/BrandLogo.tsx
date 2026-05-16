import { useState } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '../../lib/utils'

type BrandLogoProps = {
  className?: string
  compact?: boolean
  imageClassName?: string
}

export default function BrandLogo({ className, compact = false, imageClassName }: BrandLogoProps) {
  const [isMissing, setIsMissing] = useState(false)

  return (
    <Link
      to="/"
      aria-label="Ir al inicio de ONDA MULTIMEDIA"
      className={cn('inline-flex items-center gap-3', className)}
    >
      {!isMissing ? (
        <img
          src="/assets/brand/logo-onda.png"
          alt="ONDA MULTIMEDIA"
          className={cn('h-10 w-auto object-contain', compact ? 'max-w-32' : 'max-w-44', imageClassName)}
          onError={() => setIsMissing(true)}
        />
      ) : (
        <span className="neon-border inline-flex h-11 items-center justify-center rounded-md bg-onda-black px-4 font-display text-sm font-bold uppercase tracking-[0.22em] text-white shadow-[0_0_24px_rgba(157,78,221,0.45)]">
          {compact ? 'OM' : 'ONDA'}
        </span>
      )}
    </Link>
  )
}
