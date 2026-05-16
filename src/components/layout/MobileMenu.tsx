import { AnimatePresence, motion } from 'framer-motion'
import { NavLink } from 'react-router-dom'
import CTAButton from '../shared/CTAButton'

export type NavItem = {
  label: string
  to: string
}

type MobileMenuProps = {
  isOpen: boolean
  navItems: NavItem[]
  onClose: () => void
}

export default function MobileMenu({ isOpen, navItems, onClose }: MobileMenuProps) {
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
            <CTAButton to="/contacto" className="mt-3 w-full" onClick={onClose}>
              Cotiza tu proyecto
            </CTAButton>
          </nav>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
