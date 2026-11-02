import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import Icon from './Icon.jsx'

// Small menu that opens below a trigger. Closes on outside click and Esc.
// items = [{ label, icon?, to?, onClick?, danger? } | 'divider']
export default function Dropdown({ trigger, items, align = 'right', header, placement = 'bottom' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onDown = (event) => ref.current && !ref.current.contains(event.target) && setOpen(false)
    const onKey = (event) => event.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const itemClass = (danger) =>
    `flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors ${danger ? 'text-red-600 hover:bg-red-50' : 'text-slate-700 hover:bg-slate-100'}`

  return (
    <div className="relative" ref={ref}>
      {trigger({ open, toggle: () => setOpen((v) => !v) })}
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: placement === 'top' ? 6 : -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: placement === 'top' ? 6 : -6, scale: 0.97 }}
            transition={{ duration: 0.14 }}
            className={`absolute z-50 w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lift ${align === 'right' ? 'right-0' : 'left-0'} ${placement === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'}`}
          >
            {header && <div className="border-b border-slate-100 px-2.5 pb-2 pt-1">{header}</div>}
            <div className={header ? 'pt-1.5' : ''}>
              {items.map((item, i) =>
                item === 'divider' ? (
                  <div key={`d${i}`} className="my-1 h-px bg-slate-100" />
                ) : item.to ? (
                  <Link key={item.label} role="menuitem" to={item.to} className={itemClass(item.danger)} onClick={() => setOpen(false)}>
                    {item.icon && <Icon name={item.icon} className="h-4 w-4 text-slate-400" />}
                    {item.label}
                  </Link>
                ) : (
                  <button
                    key={item.label}
                    role="menuitem"
                    type="button"
                    className={itemClass(item.danger)}
                    onClick={() => {
                      setOpen(false)
                      item.onClick?.()
                    }}
                  >
                    {item.icon && <Icon name={item.icon} className={`h-4 w-4 ${item.danger ? '' : 'text-slate-400'}`} />}
                    {item.label}
                  </button>
                ),
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
