import { Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { cn } from '../../lib/utils'
import BrandLogo from '../shared/BrandLogo'
import CTAButton from '../shared/CTAButton'
import MobileMenu, { type NavItem } from './MobileMenu'
import ThemeToggle from './ThemeToggle'

const navItems: NavItem[] = [
  { label: 'Home', to: '/' },
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
        'sticky top-0 z-50 border-b transition duration-300',
        isScrolled
          ? 'border-onda-purple/20 bg-white/72 shadow-[0_16px_45px_rgba(24,24,27,0.08)] backdrop-blur-2xl dark:bg-onda-black/72 dark:shadow-[0_18px_55px_rgba(123,44,255,0.16)]'
          : 'border-transparent bg-white/48 backdrop-blur-xl dark:bg-onda-black/48',
      )}
    >
      <div className="onda-container relative flex h-20 items-center justify-between gap-4">
        <BrandLogo />

        <nav className="hidden items-center gap-2 lg:flex" aria-label="Navegacion principal">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'group relative rounded-md px-3 py-2 font-display text-xs font-bold uppercase tracking-[0.2em] transition',
                  isActive
                    ? 'text-onda-purple dark:text-onda-lavender'
                    : 'text-zinc-700 hover:text-onda-purple dark:text-onda-soft dark:hover:text-onda-lavender',
                )
              }
            >
              <span>{item.label}</span>
              <span className="absolute inset-x-3 -bottom-0.5 h-px scale-x-0 bg-onda-purple transition group-hover:scale-x-100 dark:bg-onda-lavender" />
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <CTAButton to="/contacto" className="hidden xl:inline-flex">
            Cotiza tu proyecto
          </CTAButton>
          <ThemeToggle />
          <button
            type="button"
            aria-label={isOpen ? 'Cerrar menu' : 'Abrir menu'}
            onClick={() => setIsOpen((current) => !current)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-onda-purple/25 bg-white/65 text-onda-purple transition hover:bg-onda-purple/10 lg:hidden dark:bg-white/5 dark:text-onda-lavender"
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        <MobileMenu isOpen={isOpen} navItems={navItems} onClose={() => setIsOpen(false)} />
      </div>
    </header>
  )
}
