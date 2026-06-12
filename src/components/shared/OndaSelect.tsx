import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '../../lib/utils'

export type OndaSelectOption = {
  description?: string
  disabled?: boolean
  label: string
  value: string
}

type MenuPosition = {
  left: number
  maxHeight: number
  top: number
  width: number
}

type OndaSelectProps = {
  ariaLabel?: string
  buttonClassName?: string
  className?: string
  disabled?: boolean
  icon?: ReactNode
  label?: string
  labelClassName?: string
  menuClassName?: string
  onChange: (value: string) => void
  options: OndaSelectOption[]
  placeholder?: string
  required?: boolean
  value: string
}

const defaultLabelClassName =
  'text-xs font-bold uppercase tracking-[0.12em] text-zinc-600 dark:text-onda-muted'

function getEnabledIndex(options: OndaSelectOption[], startIndex: number, direction: 1 | -1) {
  if (options.length === 0) return -1

  for (let offset = 0; offset < options.length; offset += 1) {
    const nextIndex = (startIndex + offset * direction + options.length) % options.length
    if (!options[nextIndex]?.disabled) return nextIndex
  }

  return -1
}

export default function OndaSelect({
  ariaLabel,
  buttonClassName,
  className,
  disabled = false,
  icon,
  label,
  labelClassName,
  menuClassName,
  onChange,
  options,
  placeholder,
  required = false,
  value,
}: OndaSelectProps) {
  const generatedId = useId()
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null)

  const selectedIndex = options.findIndex((option) => option.value === value)
  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : null
  const menuId = `${generatedId}-menu`
  const labelId = `${generatedId}-label`

  const selectedLabel = selectedOption?.label ?? placeholder ?? ''
  const isPlaceholder = !selectedOption || selectedOption.value === ''

  const updateMenuPosition = useCallback(() => {
    const button = buttonRef.current
    if (!button) return

    const rect = button.getBoundingClientRect()
    const viewportMargin = 12
    const gap = 8
    const availableWidth = Math.max(180, window.innerWidth - viewportMargin * 2)
    const width = Math.min(Math.max(rect.width, 180), availableWidth)
    const left = Math.min(Math.max(viewportMargin, rect.left), window.innerWidth - width - viewportMargin)
    const spaceBelow = window.innerHeight - rect.bottom - viewportMargin
    const spaceAbove = rect.top - viewportMargin
    const openAbove = spaceBelow < 220 && spaceAbove > spaceBelow
    const availableHeight = Math.max(150, (openAbove ? spaceAbove : spaceBelow) - gap)
    const maxHeight = Math.min(320, availableHeight)
    const top = openAbove ? Math.max(viewportMargin, rect.top - maxHeight - gap) : rect.bottom + gap

    setMenuPosition({ left, maxHeight, top, width })
  }, [])

  const openMenu = useCallback(() => {
    if (disabled) return

    setOpen(true)
    setActiveIndex(
      selectedIndex >= 0 && !options[selectedIndex]?.disabled
        ? selectedIndex
        : getEnabledIndex(options, 0, 1),
    )
  }, [disabled, options, selectedIndex])

  const closeMenu = useCallback(() => {
    setOpen(false)
  }, [])

  const selectOption = useCallback(
    (option: OndaSelectOption) => {
      if (option.disabled) return

      onChange(option.value)
      setOpen(false)
      window.requestAnimationFrame(() => buttonRef.current?.focus())
    },
    [onChange],
  )

  useEffect(() => {
    if (!open) return undefined

    updateMenuPosition()

    const handleScrollOrResize = () => updateMenuPosition()
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node

      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return
      closeMenu()
    }

    window.addEventListener('resize', handleScrollOrResize)
    window.addEventListener('scroll', handleScrollOrResize, true)
    document.addEventListener('pointerdown', handlePointerDown)

    return () => {
      window.removeEventListener('resize', handleScrollOrResize)
      window.removeEventListener('scroll', handleScrollOrResize, true)
      document.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [closeMenu, open, updateMenuPosition])

  useEffect(() => {
    if (!open || activeIndex < 0) return

    const optionElement = document.getElementById(`${menuId}-${activeIndex}`)
    optionElement?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, menuId, open])

  const firstEnabledIndex = useMemo(() => getEnabledIndex(options, 0, 1), [options])
  const lastEnabledIndex = useMemo(() => getEnabledIndex(options, options.length - 1, -1), [options])

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()

      if (!open) {
        openMenu()
        return
      }

      const direction = event.key === 'ArrowDown' ? 1 : -1
      const startIndex = activeIndex < 0 ? (direction === 1 ? 0 : options.length - 1) : activeIndex + direction
      setActiveIndex(getEnabledIndex(options, startIndex, direction))
      return
    }

    if (event.key === 'Home') {
      event.preventDefault()
      if (!open) openMenu()
      setActiveIndex(firstEnabledIndex)
      return
    }

    if (event.key === 'End') {
      event.preventDefault()
      if (!open) openMenu()
      setActiveIndex(lastEnabledIndex)
      return
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()

      if (!open) {
        openMenu()
        return
      }

      const option = options[activeIndex]
      if (option) selectOption(option)
      return
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      closeMenu()
    }
  }

  const menu = open && menuPosition
    ? createPortal(
        <div
          ref={menuRef}
          id={menuId}
          role="listbox"
          aria-labelledby={label ? labelId : undefined}
          className={cn(
            'fixed z-[1200] overflow-y-auto rounded-md border border-onda-purple/25 bg-white/95 p-1 text-zinc-950 shadow-[0_24px_70px_rgba(24,24,27,0.18)] backdrop-blur-xl dark:border-onda-lavender/25 dark:bg-onda-night/95 dark:text-onda-soft dark:shadow-[0_28px_80px_rgba(0,0,0,0.48)]',
            menuClassName,
          )}
          style={{
            left: menuPosition.left,
            maxHeight: menuPosition.maxHeight,
            top: menuPosition.top,
            width: menuPosition.width,
          }}
        >
          {options.map((option, index) => {
            const selected = option.value === value
            const active = index === activeIndex

            return (
              <button
                key={`${option.value}-${index}`}
                id={`${menuId}-${index}`}
                type="button"
                role="option"
                aria-selected={selected}
                disabled={option.disabled}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => selectOption(option)}
                className={cn(
                  'flex min-h-10 w-full min-w-0 items-center justify-between gap-3 rounded-[0.35rem] px-3 py-2 text-left text-sm font-semibold outline-none transition disabled:cursor-not-allowed disabled:opacity-45',
                  active && 'bg-onda-purple/10 text-onda-purple dark:bg-onda-purple/22 dark:text-white',
                  selected && 'bg-onda-purple/15 text-onda-purple dark:bg-onda-purple/35 dark:text-white',
                  !active && !selected && 'hover:bg-onda-purple/10 dark:hover:bg-white/10',
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate">{option.label}</span>
                  {option.description ? (
                    <span className="mt-0.5 block truncate text-xs font-medium text-zinc-500 dark:text-onda-muted">
                      {option.description}
                    </span>
                  ) : null}
                </span>
                {selected ? <Check className="h-4 w-4 shrink-0 text-onda-lavender" aria-hidden="true" /> : null}
              </button>
            )
          })}
        </div>,
        document.body,
      )
    : null

  return (
    <div className={cn('grid min-w-0 gap-2', className)}>
      {label ? (
        <span id={labelId} className={cn(defaultLabelClassName, labelClassName)}>
          {label}
        </span>
      ) : null}
      <button
        ref={buttonRef}
        type="button"
        aria-activedescendant={open && activeIndex >= 0 ? `${menuId}-${activeIndex}` : undefined}
        aria-controls={open ? menuId : undefined}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel ?? label}
        aria-labelledby={label ? `${labelId}` : undefined}
        aria-required={required || undefined}
        disabled={disabled}
        onClick={() => (open ? closeMenu() : openMenu())}
        onKeyDown={handleKeyDown}
        className={cn(
          'group flex min-h-11 w-full min-w-0 items-center justify-between gap-2 rounded-md border border-onda-purple/20 bg-white/[0.82] px-3 py-2 text-left text-sm font-semibold text-zinc-950 outline-none transition focus:border-onda-purple focus:ring-2 focus:ring-onda-purple/25 disabled:cursor-not-allowed disabled:opacity-55 dark:border-onda-lavender/22 dark:bg-white/10 dark:text-white dark:focus:border-onda-lavender dark:focus:ring-onda-purple/40',
          buttonClassName,
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          {icon ? <span className="shrink-0 text-onda-lavender">{icon}</span> : null}
          <span
            className={cn(
              'min-w-0 truncate',
              isPlaceholder && 'text-zinc-500 dark:text-onda-muted',
            )}
          >
            {selectedLabel}
          </span>
        </span>
        <ChevronDown
          className={cn('h-4 w-4 shrink-0 text-onda-lavender transition', open && 'rotate-180')}
          aria-hidden="true"
        />
      </button>
      {menu}
    </div>
  )
}
