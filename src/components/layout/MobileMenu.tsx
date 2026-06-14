import { AnimatePresence, motion } from 'framer-motion'
import { NavLink } from 'react-router-dom'
import { useI18n } from '../../hooks/useI18n'
import CTAButton from '../shared/CTAButton'

export type NavItem = {
  label: string
  to: string
}

type MobileMenuProps = {
  isOpen: boolean
  navItems: NavItem[]
  loginLabel: string
  onClose: () => void
  onLoginClick: () => void
}

export default function MobileMenu({ isOpen, navItems, loginLabel, onClose, onLoginClick }: MobileMenuProps) {
  const { t } = useI18n()
  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.24 }}
          className="onda-container absolute left-0 right-0 top-full mt-3 lg:hidden"
        >
          <nav className="glass-panel rounded-lg p-3">
            <div className="grid gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    [
                      'rounded-md px-4 py-3 font-display text-xs font-bold uppercase tracking-[0.18em] transition',
                      isActive
                        ? 'bg-onda-purple text-white'
                        : 'text-zinc-700 hover:bg-onda-purple/10 dark:text-onda-soft dark:hover:bg-white/10',
                    ].join(' ')
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                onClose()
                onLoginClick()
              }}
              aria-label={loginLabel}
              className="group relative mt-4 inline-flex h-11 w-full items-center justify-center overflow-hidden rounded-md border border-onda-purple/40 bg-white/90 px-5 font-display text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-onda-purple shadow-[0_0_15px_rgba(123,44,255,0.15)] transition-all duration-300 ease-out hover:border-onda-purple hover:bg-onda-purple/5 hover:shadow-[0_0_30px_rgba(123,44,255,0.35)] dark:border-onda-lavender/45 dark:bg-white/8 dark:text-onda-lavender dark:hover:shadow-[0_0_35px_rgba(123,44,255,0.45)]"
            >
              <span className="pointer-events-none absolute inset-0 rounded-md">
                <span className="absolute inset-0 rounded-md bg-onda-purple/0 transition-all duration-500 group-hover:bg-onda-purple/5" />
                <span className="absolute -inset-1 rounded-md border border-onda-purple/0 opacity-0 scale-90 transition-all duration-500 group-hover:scale-100 group-hover:border-onda-purple/30 group-hover:opacity-100" />
              </span>
              <span className="absolute inset-0 -translate-x-full skew-x-12 bg-gradient-to-r from-transparent via-onda-purple/15 to-transparent transition-transform duration-700 ease-in-out group-hover:translate-x-full" />
              <span className="relative z-10 inline-block transition-transform duration-300 group-hover:scale-105">
                {loginLabel}
              </span>
            </button>

            <CTAButton to="/contacto" className="mt-3 w-full" onClick={onClose}>
              {t('nav.quote-full')}
            </CTAButton>
          </nav>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
