'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, Check, ChevronDown, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SelectOption {
  value: string
  label: string
  sub?: string // secondary text shown below label (e.g. doctor specialization)
}

interface SearchableSelectProps {
  value: string
  onValueChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  className?: string
  disabled?: boolean
  clearable?: boolean
}

export function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder = 'Select…',
  searchPlaceholder = 'Type to search…',
  emptyText = 'No results found',
  className,
  disabled = false,
  clearable = true,
}: SearchableSelectProps) {
  const [open, setOpen]   = useState(false)
  const [query, setQuery] = useState('')
  const ref               = useRef<HTMLDivElement>(null)
  const inputRef          = useRef<HTMLInputElement>(null)
  const listRef           = useRef<HTMLDivElement>(null)
  const [highlighted, setHighlighted] = useState<number>(-1)

  const selected = options.find(o => o.value === value)
  const filtered = query.trim()
    ? options.filter(
        o =>
          o.label.toLowerCase().includes(query.toLowerCase()) ||
          (o.sub ?? '').toLowerCase().includes(query.toLowerCase())
      )
    : options

  // Reset highlight when filtered list changes
  useEffect(() => { setHighlighted(-1) }, [query])

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Focus search input when dropdown opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 40)
  }, [open])

  function toggle() {
    if (disabled) return
    setOpen(o => !o)
    if (open) setQuery('')
  }

  function pick(opt: SelectOption) {
    onValueChange(opt.value)
    setOpen(false)
    setQuery('')
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation()
    onValueChange('')
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault()
        setOpen(true)
      }
      return
    }
    if (e.key === 'Escape') {
      setOpen(false)
      setQuery('')
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlighted(h => Math.min(h + 1, filtered.length - 1))
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted(h => Math.max(h - 1, 0))
    }
    if (e.key === 'Enter' && highlighted >= 0 && filtered[highlighted]) {
      e.preventDefault()
      pick(filtered[highlighted])
    }
  }

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlighted < 0 || !listRef.current) return
    const item = listRef.current.children[highlighted] as HTMLElement | undefined
    item?.scrollIntoView({ block: 'nearest' })
  }, [highlighted])

  return (
    <div ref={ref} className={cn('relative w-full', className)} onKeyDown={handleKeyDown}>
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={toggle}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          'flex w-full h-10 items-center gap-2 rounded-lg border bg-white px-3 text-sm transition-colors',
          'border-gray-300 hover:border-blue-400 hover:bg-gray-50/40',
          'outline-none focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-100',
          open && 'border-blue-500 ring-2 ring-blue-100',
          disabled && 'cursor-not-allowed opacity-50',
        )}
      >
        <span className={cn('flex-1 truncate text-left', !selected && 'text-gray-400')}>
          {selected
            ? <>{selected.label}{selected.sub && <span className="ml-1.5 text-gray-400 text-xs font-normal">· {selected.sub}</span>}</>
            : placeholder}
        </span>
        <span className="flex items-center gap-1 shrink-0">
          {clearable && value && (
            <span
              role="button"
              tabIndex={-1}
              onClick={clear}
              className="flex items-center justify-center w-4 h-4 rounded text-gray-300 hover:text-gray-500 hover:bg-gray-100"
            >
              <X className="w-3 h-3" />
            </span>
          )}
          <ChevronDown
            className={cn(
              'w-4 h-4 text-gray-400 transition-transform duration-200',
              open && 'rotate-180'
            )}
          />
        </span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1.5 w-full rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100">
          {/* Search box */}
          <div className="px-2 pt-2 pb-1.5 border-b border-gray-100">
            <div className="flex items-center gap-2 h-8 rounded-lg bg-gray-50 border border-gray-200 px-2.5">
              <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="flex-1 min-w-0 bg-transparent text-sm text-gray-800 placeholder:text-gray-400 outline-none"
              />
              {query && (
                <button type="button" onClick={() => setQuery('')} className="text-gray-300 hover:text-gray-500">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Option list */}
          <div ref={listRef} role="listbox" className="max-h-56 overflow-y-auto py-1.5">
            {filtered.length === 0 ? (
              <div className="py-6 text-center text-sm text-gray-400">{emptyText}</div>
            ) : (
              filtered.map((opt, i) => {
                const isSelected = opt.value === value
                const isHighlighted = i === highlighted
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => pick(opt)}
                    onMouseEnter={() => setHighlighted(i)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 text-left rounded-lg mx-1 transition-colors',
                      'w-[calc(100%-8px)]',
                      isSelected
                        ? 'bg-blue-50 text-blue-800'
                        : isHighlighted
                        ? 'bg-gray-100 text-gray-800'
                        : 'text-gray-700 hover:bg-gray-50',
                    )}
                  >
                    <span className="flex-1 min-w-0">
                      <span className={cn('block text-sm truncate', isSelected && 'font-medium')}>
                        {opt.label}
                      </span>
                      {opt.sub && (
                        <span className={cn('block text-xs truncate mt-0.5', isSelected ? 'text-blue-500' : 'text-gray-400')}>
                          {opt.sub}
                        </span>
                      )}
                    </span>
                    {isSelected && (
                      <Check className="w-4 h-4 text-blue-600 shrink-0 stroke-[2.5]" />
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
