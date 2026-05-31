import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '../../lib/utils'

type CTAButtonProps = {
  children: ReactNode
  className?: string
  disabled?: boolean
  href?: string
  icon?: ReactNode
  onClick?: () => void
  rel?: string
  target?: string
  to?: string
  type?: 'button' | 'submit' | 'reset'
  variant?: 'primary' | 'secondary' | 'ghost'
}

const variants = {
  primary:
    'bg-onda-purple text-white shadow-[0_0_26px_rgba(123,44,255,0.34)] hover:bg-onda-electric hover:shadow-[0_0_34px_rgba(168,85,247,0.48)]',
  secondary:
    'border border-onda-purple/35 bg-white/65 text-onda-purple hover:border-onda-purple hover:bg-onda-purple/10 dark:bg-white/5 dark:text-onda-soft',
  ghost:
    'border border-white/10 bg-white/5 text-onda-soft hover:border-onda-lavender/50 hover:bg-onda-purple/15',
}

export default function CTAButton({
  children,
  className,
  disabled = false,
  href,
  icon,
  onClick,
  rel,
  target,
  to,
  type = 'button',
  variant = 'primary',
}: CTAButtonProps) {
  const buttonClassName = cn(
    'inline-flex min-h-11 max-w-full items-center justify-center gap-2 rounded-md px-5 py-3 text-center font-display text-xs font-bold uppercase tracking-[0.18em] transition duration-300 disabled:cursor-not-allowed disabled:opacity-60',
    variants[variant],
    className,
  )
  const content = (
    <>
      {icon}
      <span className="min-w-0 break-words">{children}</span>
    </>
  )

  if (to) {
    return (
      <Link
        to={to}
        onClick={disabled ? undefined : onClick}
        aria-disabled={disabled}
        className={buttonClassName}
      >
        {content}
      </Link>
    )
  }

  if (href) {
    return (
      <a
        href={disabled ? undefined : href}
        target={target}
        rel={rel}
        onClick={disabled ? undefined : onClick}
        aria-disabled={disabled}
        className={buttonClassName}
      >
        {content}
      </a>
    )
  }

  return (
    <button type={type} onClick={onClick} disabled={disabled} className={buttonClassName}>
      {content}
    </button>
  )
}
