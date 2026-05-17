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
        'sticky top-0 z-50 border-b backdrop-blur-3xl transition duration-300 before:pointer-events-none before:absolute before:inset-x-0 before:bottom-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-onda-purple/45 before:to-transparent',
        isScrolled
          ? 'border-white/16 bg-onda-night/82 shadow-[0_18px_80px_rgba(123,44,255,0.18)]'
          : 'border-white/10 bg-onda-night/68 shadow-[0_12px_64px_rgba(123,44,255,0.14)]',
      )}
    >
      <div className="onda-container relative flex h-20 items-center justify-between gap-4 py-2">
        <BrandLogo className="shrink-0" imageClassName="h-12 max-w-[11.5rem] sm:h-14 sm:max-w-[13.5rem]" />

        <nav
          className="hidden items-center gap-1 rounded-lg border border-white/14 bg-white/[0.07] px-2 py-1.5 shadow-[0_0_32px_rgba(123,44,255,0.14)] backdrop-blur-2xl lg:flex"
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
                    ? 'bg-onda-purple/18 text-onda-lavender shadow-[0_0_18px_rgba(123,44,255,0.16)]'
                    : 'text-white/72 hover:bg-white/10 hover:text-white',
                )
              }
            >
              <span>{item.label}</span>
              <span className="absolute inset-x-3 -bottom-px h-px scale-x-0 bg-onda-purple transition duration-300 group-hover:scale-x-100 dark:bg-onda-lavender" />
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            to="/contacto"
            className="hidden min-h-11 items-center justify-center rounded-md border border-onda-lavender/30 bg-white/[0.07] px-5 py-3 font-display text-[0.68rem] font-bold uppercase tracking-[0.18em] text-white shadow-[0_0_28px_rgba(123,44,255,0.2)] backdrop-blur-2xl transition duration-300 hover:border-onda-lavender/60 hover:bg-onda-purple/16 hover:shadow-[0_0_36px_rgba(168,85,247,0.3)] xl:inline-flex"
          >
            Cotiza tu proyecto
          </Link>
          <ThemeToggle />
          <button
            type="button"
            aria-label={isOpen ? 'Cerrar menu' : 'Abrir menu'}
            onClick={() => setIsOpen((current) => !current)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/18 bg-white/14 text-onda-purple shadow-[0_0_22px_rgba(123,44,255,0.14)] backdrop-blur-xl transition duration-300 hover:border-onda-purple hover:bg-onda-purple/10 lg:hidden dark:border-onda-purple/30 dark:bg-white/5 dark:text-onda-lavender"
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        <MobileMenu isOpen={isOpen} navItems={navItems} onClose={() => setIsOpen(false)} />
      </div>
    </header>
  )
}
