import { Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useI18n } from '../../hooks/useI18n'
import { cn } from '../../lib/utils'
import BrandLogo from '../shared/BrandLogo'
import LanguageToggle from './LanguageToggle'
import MobileMenu, { type NavItem } from './MobileMenu'
import ThemeToggle from './ThemeToggle'

export default function Header() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)

  const navItems: NavItem[] = [
    { label: t('nav.home'), to: '/' },
    { label: t('nav.artists'), to: '/artistas' },
    { label: t('nav.events'), to: '/eventos' },
    { label: t('nav.services'), to: '/servicios' },
    { label: t('nav.contact'), to: '/contacto' },
  ]

  const handleLogin = () => {
    navigate('/login')
  }

  useEffect(() => {
    const updateScrollState = () => setIsScrolled(window.scrollY > 8)

    updateScrollState()
    window.addEventListener('scroll', updateScrollState, { passive: true })

    return () => window.removeEventListener('scroll', updateScrollState)
  }, [])

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 w-full border-b transition duration-300 before:pointer-events-none before:absolute before:inset-x-0 before:bottom-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-onda-purple/38 before:to-transparent dark:before:via-onda-lavender/42',
        isScrolled
          ? 'backdrop-blur-xl border-onda-purple/16 bg-white/[0.88] shadow-[0_18px_80px_rgba(123,44,255,0.14)] dark:border-white/16 dark:bg-onda-night/82 dark:shadow-[0_18px_80px_rgba(123,44,255,0.18)]'
          : 'backdrop-blur-none border-onda-purple/8 bg-white/95 shadow-[0_10px_34px_rgba(24,24,27,0.06)] dark:border-white/10 dark:bg-onda-night/70 dark:shadow-[0_12px_64px_rgba(123,44,255,0.14)]',
      )}
    >
      <div className="onda-container relative flex h-20 items-center justify-between gap-4 py-2 sm:gap-6 lg:flex lg:flex-row lg:justify-between">
        {/* Logo - izquierda */}
        <BrandLogo className="min-w-0 shrink-0" imageClassName="h-10 max-w-[9rem] sm:h-14 sm:max-w-[13.5rem]" />

        {/* Desktop Navigation - centrado con un pequeño offset a la derecha */}
        <div className="hidden lg:flex lg:items-center lg:justify-center lg:flex-1 lg:translate-x-4">
          <nav
            className="flex items-center gap-1 rounded-lg border border-onda-purple/12 bg-white/[0.82] px-3 py-1.5 shadow-[0_0_32px_rgba(123,44,255,0.1)] backdrop-blur-2xl dark:border-white/14 dark:bg-white/[0.07] dark:shadow-[0_0_32px_rgba(123,44,255,0.14)]"
            aria-label={t('nav.main-aria')}
          >
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'group relative rounded-md px-3.5 py-2 font-display text-[0.68rem] font-semibold uppercase tracking-[0.22em] transition duration-300',
                    isActive
                      ? 'bg-onda-purple/12 text-onda-purple shadow-[0_0_18px_rgba(123,44,255,0.12)] dark:bg-onda-purple/18 dark:text-onda-lavender dark:shadow-[0_0_18px_rgba(123,44,255,0.16)]'
                      : 'text-zinc-700 hover:bg-onda-purple/8 hover:text-onda-purple dark:text-white/72 dark:hover:bg-white/10 dark:hover:text-white',
                  )
                }
              >
                <span>{item.label}</span>
                <span className="absolute inset-x-3 -bottom-px h-px scale-x-0 bg-onda-purple transition duration-300 group-hover:scale-x-100 dark:bg-onda-lavender" />
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Botones derecha - con espacio consistente */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <LanguageToggle />
          
          {/* LOG IN BUTTON - Opción 3: Efecto onda + pulso */}
          <button
            type="button"
            onClick={handleLogin}
            aria-label="Log in"
            className={cn(
              'inline-flex items-center justify-center relative overflow-hidden',
              'h-9 px-5',
              'rounded-md',
              'font-display text-[0.7rem] font-semibold uppercase tracking-[0.2em]',
              'border border-onda-purple/40',
              'bg-white/90 text-onda-purple',
              'shadow-[0_0_15px_rgba(123,44,255,0.15)]',
              'transition-all duration-300 ease-out',
              'hover:border-onda-purple hover:bg-onda-purple/5 hover:shadow-[0_0_30px_rgba(123,44,255,0.35)]',
              'dark:border-onda-lavender/45 dark:bg-white/8 dark:text-onda-lavender',
              'dark:hover:shadow-[0_0_35px_rgba(123,44,255,0.45)]',
              'group',
            )}
          >
            {/* Anillo de onda expansiva */}
            <span className="absolute inset-0 rounded-md pointer-events-none">
              <span className="absolute inset-0 rounded-md bg-onda-purple/0 group-hover:bg-onda-purple/5 transition-all duration-500" />
              <span className="absolute -inset-1 rounded-md border border-onda-purple/0 group-hover:border-onda-purple/30 transition-all duration-500 scale-90 group-hover:scale-100 opacity-0 group-hover:opacity-100" />
            </span>
            
            {/* Efecto de brillo deslizante */}
            <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out bg-gradient-to-r from-transparent via-onda-purple/15 to-transparent skew-x-12" />
            
            {/* Texto con elevación */}
            <span className="relative z-10 transition-transform duration-300 group-hover:scale-105 inline-block">
              LOG IN
            </span>
          </button>

          <ThemeToggle />
          
          {/* Menú hamburguesa (mobile) */}
          <button
            type="button"
            aria-label={isOpen ? t('nav.close-menu') : t('nav.open-menu')}
            onClick={() => setIsOpen((current) => !current)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-onda-purple/18 bg-white/80 text-onda-purple shadow-[0_0_22px_rgba(123,44,255,0.1)] backdrop-blur-xl transition duration-300 hover:border-onda-purple hover:bg-onda-purple/10 lg:hidden dark:border-onda-purple/30 dark:bg-white/5 dark:text-onda-lavender dark:shadow-[0_0_22px_rgba(123,44,255,0.14)]"
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        <MobileMenu 
          isOpen={isOpen} 
          navItems={[...navItems, { label: 'LOG IN', to: '/login' }]}
          onClose={() => setIsOpen(false)} 
        />
      </div>
    </header>
  )
}