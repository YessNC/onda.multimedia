import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

type GlowCardProps = {
  children: ReactNode
  className?: string
  delay?: number
}

export default function GlowCard({ children, className, delay = 0 }: GlowCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.55, delay }}
      className={cn('glass-panel rounded-lg p-5 transition duration-300 hover:-translate-y-1', className)}
    >
      {children}
    </motion.div>
  )
}
