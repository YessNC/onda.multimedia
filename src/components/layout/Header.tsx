import { Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { cn } from '../../lib/utils'
import BrandLogo from '../shared/BrandLogo'
import MobileMenu, { type NavItem } from './MobileMenu'
import ThemeToggle from './ThemeToggle'

const navItems: NavItem[] = [
  { label: 'Home', to: '/' },
  { label: 'Artistas', to: '/artistas' },
  { label: 'Eventos', to: '/eventos' },
  { label: 'Servicios', to: '/servicios' },
  { label: 'Contacto', to: '/contacto' },
]

export default function Header() {
  const [isOpen, setIsOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const updateScrollState = () => setIsScrolled(window.scrollY > 8)

    updateScrollState()
    window.addEventListener('scroll', updateScrollState, { passive: true })

    return () => window.removeEventListener('scroll', updateScrollState)
  }, [])

  return (
    <header
      className={cn(
        'sticky top-0 z-50 border-b backdrop-blur-3xl backdrop-saturate-150 transition duration-300 before:pointer-events-none before:absolute before:inset-x-0 before:bottom-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-onda-purple/38 before:to-transparent dark:before:via-onda-lavender/42',
        isScrolled
          ? 'border-onda-purple/16 bg-white/[0.88] shadow-[0_18px_80px_rgba(123,44,255,0.14)] dark:border-white/16 dark:bg-onda-night/82 dark:shadow-[0_18px_80px_rgba(123,44,255,0.18)]'
          : 'border-onda-purple/8 bg-white shadow-[0_10px_34px_rgba(24,24,27,0.06)] dark:border-white/10 dark:bg-onda-night/68 dark:shadow-[0_12px_64px_rgba(123,44,255,0.14)]',
      )}
    >
      <div className="onda-container relative flex h-20 items-center justify-between gap-2 py-2 sm:gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        <BrandLogo className="min-w-0 shrink lg:justify-self-start" imageClassName="h-10 max-w-[9rem] sm:h-14 sm:max-w-[13.5rem]" />

        <nav
          className="hidden items-center gap-1 justify-self-center rounded-lg border border-onda-purple/12 bg-white/[0.82] px-2 py-1.5 shadow-[0_0_32px_rgba(123,44,255,0.1)] backdrop-blur-2xl lg:flex dark:border-white/14 dark:bg-white/[0.07] dark:shadow-[0_0_32px_rgba(123,44,255,0.14)]"
          aria-label="Navegacion principal"
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

        <div className="flex shrink-0 items-center gap-2 sm:gap-3 lg:justify-self-end">
          <Link
            to="/contacto"
            aria-label="Cotiza tu proyecto"
            className="hidden min-h-11 w-32 items-center justify-center rounded-md border border-onda-purple/20 bg-onda-purple/8 px-4 py-3 text-center font-display text-[0.68rem] font-bold uppercase tracking-[0.14em] text-onda-purple shadow-[0_0_28px_rgba(123,44,255,0.12)] backdrop-blur-2xl transition duration-300 hover:border-onda-purple/45 hover:bg-onda-purple/12 hover:shadow-[0_0_36px_rgba(168,85,247,0.18)] xl:inline-flex dark:border-onda-lavender/30 dark:bg-white/[0.07] dark:text-white dark:shadow-[0_0_28px_rgba(123,44,255,0.2)] dark:hover:border-onda-lavender/60 dark:hover:bg-onda-purple/16 dark:hover:shadow-[0_0_36px_rgba(168,85,247,0.3)]"
          >
            Cotizar
          </Link>
          <ThemeToggle />
          <button
            type="button"
            aria-label={isOpen ? 'Cerrar menu' : 'Abrir menu'}
            onClick={() => setIsOpen((current) => !current)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-onda-purple/18 bg-white/80 text-onda-purple shadow-[0_0_22px_rgba(123,44,255,0.1)] backdrop-blur-xl transition duration-300 hover:border-onda-purple hover:bg-onda-purple/10 lg:hidden dark:border-onda-purple/30 dark:bg-white/5 dark:text-onda-lavender dark:shadow-[0_0_22px_rgba(123,44,255,0.14)]"
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        <MobileMenu isOpen={isOpen} navItems={navItems} onClose={() => setIsOpen(false)} />
      </div>
    </header>
  )
}
