import { motion } from 'motion/react'

// Fades/slides its children in the first time they scroll into view.
export default function Reveal({ children, delay = 0, y = 18, className = '', as = 'div' }) {
  const Component = motion[as]
  return (
    <Component
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </Component>
  )
}
