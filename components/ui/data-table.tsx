'use client'

import { useState, useMemo } from 'react'
import { ChevronsUpDown, ChevronUp, ChevronDown, Download, Printer, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from '@/components/ui/checkbox'

// ─── Column definition ─────────────────────────────────────────────────────────

export interface ColumnDef<T> {
  key: string
  header: string

  render?: (row: T, index: number) => React.ReactNode

  accessor?: keyof T

  sortValue?: (row: T) => string | number | Date

  /** Plain-text value used for CSV export and print. Falls back to `accessor`. */
  csvValue?: (row: T) => string

  sortable?: boolean

  align?: 'left' | 'center' | 'right'
  width?: string
  className?: string
  headerClassName?: string
  skeletonWidth?: string
}

// ─── Props ─────────────────────────────────────────────────────────────────────

interface DataTableProps<T extends object> {
  columns: ColumnDef<T>[]
  data: T[]

  /** Unique key for each row — used for selection and React keys. */
  rowKey: (row: T) => string

  loading?: boolean
  skeletonRows?: number

  emptyText?: string
  emptyNode?: React.ReactNode

  onRowClick?: (row: T) => void
  rowClassName?: (row: T, index: number) => string

  // ── Selection ──
  selectable?: boolean
  selectedKeys?: Set<string>
  onSelectAll?: (allKeys: string[]) => void
  onSelectRow?: (key: string, checked: boolean) => void

  // ── Controlled sort (server-side pagination) ──
  sortKey?: string
  sortDir?: 'asc' | 'desc'
  onSort?: (key: string, dir: 'asc' | 'desc') => void

  // ── Default client-side sort ──
  defaultSortKey?: string
  defaultSortDir?: 'asc' | 'desc'

  stickyHeader?: boolean
  className?: string
  wrapperClassName?: string

  // ── Built-in toolbar ──
  searchValue?: string
  onSearchChange?: (val: string) => void
  searchPlaceholder?: string
  /** Extra controls rendered between search and the export buttons (e.g. page-size select, bulk-action buttons). */
  toolbarRight?: React.ReactNode

  // ── Export ──
  downloadable?: boolean
  printable?: boolean
  /** Base filename (without extension) for CSV download and print title. */
  fileName?: string
}

// ─── Sort icon ─────────────────────────────────────────────────────────────────

function SortIcon({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) {
  if (!active) return <ChevronsUpDown className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 transition-colors" />
  return dir === 'asc'
    ? <ChevronUp   className="w-3.5 h-3.5 text-primary-600" />
    : <ChevronDown className="w-3.5 h-3.5 text-primary-600" />
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function DataTable<T extends object>({
  columns,
  data,
  rowKey,
  loading = false,
  skeletonRows = 5,
  emptyText = 'No data found',
  emptyNode,
  onRowClick,
  rowClassName,
  selectable,
  selectedKeys,
  onSelectAll,
  onSelectRow,
  sortKey: externalSortKey,
  sortDir: externalSortDir,
  onSort,
  defaultSortKey,
  defaultSortDir = 'asc',
  stickyHeader = true,
  className,
  wrapperClassName,
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  toolbarRight,
  downloadable,
  printable,
  fileName,
}: DataTableProps<T>) {
  // ── Internal (client-side) sort state ──────────────────────────────────────
  const [intKey, setIntKey] = useState<string | null>(defaultSortKey ?? null)
  const [intDir, setIntDir] = useState<'asc' | 'desc'>(defaultSortDir)

  const isControlled  = !!onSort
  const activeSortKey = isControlled ? (externalSortKey ?? null) : intKey
  const activeSortDir = isControlled ? (externalSortDir ?? 'asc') : intDir

  function handleHeaderClick(col: ColumnDef<T>) {
    if (!col.sortable) return
    const newDir: 'asc' | 'desc' =
      activeSortKey === col.key && activeSortDir === 'asc' ? 'desc' : 'asc'
    if (isControlled) {
      onSort!(col.key, newDir)
    } else {
      setIntKey(col.key)
      setIntDir(newDir)
    }
  }

  // ── Client-side sort ───────────────────────────────────────────────────────
  const displayData = useMemo(() => {
    if (isControlled || !intKey) return data
    const col = columns.find(c => c.key === intKey)
    if (!col) return data

    return [...data].sort((a, b) => {
      let av: string | number | Date
      let bv: string | number | Date

      if (col.sortValue) {
        av = col.sortValue(a)
        bv = col.sortValue(b)
      } else if (col.accessor) {
        av = (a[col.accessor] as string | number) ?? ''
        bv = (b[col.accessor] as string | number) ?? ''
      } else {
        return 0
      }

      if (av < bv) return intDir === 'asc' ? -1 : 1
      if (av > bv) return intDir === 'asc' ? 1 : -1
      return 0
    })
  }, [data, isControlled, intKey, intDir, columns])

  // ── Selection helpers ──────────────────────────────────────────────────────
  const allKeys      = displayData.map(r => rowKey(r))
  const selectedCount = selectedKeys?.size ?? 0
  const allSelected   = selectedCount > 0 && selectedCount === allKeys.length
  const someSelected  = selectedCount > 0 && !allSelected

  // ── Alignment helper ───────────────────────────────────────────────────────
  // Text-align works for plain-text cells, but not for non-inline content
  // (e.g. a flex-based Checkbox/Switch), so cell content is wrapped in a
  // matching flex container rather than relying on text-align alone.
  const alignClass = (align?: 'left' | 'center' | 'right') =>
    align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : ''

  const flexAlignClass = (align?: 'left' | 'center' | 'right') =>
    align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'

  const totalCols = columns.length + (selectable ? 1 : 0)

  // ── Export columns (skip action-only columns) ──────────────────────────────
  const exportCols = columns.filter(c => c.header.trim() && c.key !== 'actions')

  function getCellText(col: ColumnDef<T>, row: T): string {
    if (col.csvValue) return col.csvValue(row)
    if (col.accessor != null) return String(row[col.accessor] ?? '')
    return ''
  }

  function downloadCSV() {
    const header = exportCols.map(c => `"${c.header.replace(/"/g, '""')}"`).join(',')
    const rows = displayData.map(row =>
      exportCols.map(c => `"${getCellText(c, row).replace(/"/g, '""')}"`).join(',')
    ).join('\n')
    const blob = new Blob([header + '\n' + rows], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `${fileName ?? 'export'}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function printTable() {
    const thead = exportCols.map(c => `<th>${c.header}</th>`).join('')
    const tbody = displayData.map(row =>
      `<tr>${exportCols.map(c => `<td>${getCellText(c, row)}</td>`).join('')}</tr>`
    ).join('')
    const win = window.open('', '_blank', 'width=960,height=640')
    if (!win) return
    win.document.write(`<!DOCTYPE html><html><head>
      <title>${fileName ?? 'Print'}</title>
      <style>
        *{box-sizing:border-box}body{font-family:system-ui,sans-serif;font-size:12px;margin:20px;color:#111}
        h2{font-size:15px;font-weight:600;margin-bottom:10px}
        table{border-collapse:collapse;width:100%}
        th,td{border:1px solid #d1d5db;padding:5px 8px;text-align:left;vertical-align:middle}
        th{background:#f3f4f6;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#374151}
        tr:nth-child(even) td{background:#f9fafb}
        @media print{body{margin:8px}}
      </style>
    </head><body>
      <h2>${fileName ?? 'Data'}</h2>
      <table><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody></table>
    </body></html>`)
    win.document.close()
    win.focus()
    setTimeout(() => win.print(), 250)
  }

  const showToolbar = !!(onSearchChange || toolbarRight || downloadable || printable)

  return (
    <div className={cn('border border-gray-200 bg-white overflow-hidden', wrapperClassName)}>
      {showToolbar && (
        <div className="sticky top-0 z-20 flex items-center gap-2 px-3 h-12 bg-white shrink-0">
          {onSearchChange && (
            <div className="relative w-56">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              <input
                type="search"
                value={searchValue ?? ''}
                onChange={e => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-8 pr-3 h-8 text-sm border border-gray-300 rounded-lg outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-colors"
              />
            </div>
          )}
          <div className="ml-auto flex items-center gap-1.5">
            {toolbarRight}
            {downloadable && (
              <button
                type="button"
                onClick={downloadCSV}
                title="Download CSV"
                className="inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-primary-600 border border-gray-200 hover:border-primary-300 bg-white rounded-lg px-2.5 py-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                CSV
              </button>
            )}
            {printable && (
              <button
                type="button"
                onClick={printTable}
                title="Print table"
                className="inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-primary-600 border border-gray-200 hover:border-primary-300 bg-white rounded-lg px-2.5 py-1.5 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                Print
              </button>
            )}
          </div>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className={cn('w-full text-sm border-collapse', className)}>
          {/* ── Header ───────────────────────────────────────────────────── */}
          <thead className={cn(stickyHeader && 'sticky top-0 z-10')}>
            <tr className="border-b border-gray-200 bg-gray-50">
              {selectable && (
                <th className="w-10 py-3 pl-4 pr-2">
                  <Checkbox
                    checked={allSelected}
                    data-state={someSelected ? 'indeterminate' : undefined}
                    onCheckedChange={checked => onSelectAll?.(checked ? allKeys : [])}
                    className="border-gray-300"
                  />
                </th>
              )}
              {columns.map(col => (
                <th
                  key={col.key}
                  style={col.width && !col.width.startsWith('w-') ? { width: col.width } : undefined}
                  className={cn(
                    'py-3 px-3 text-left font-semibold text-xs text-gray-500 uppercase tracking-wide whitespace-nowrap',
                    col.width?.startsWith('w-') && col.width,
                    alignClass(col.align),
                    col.sortable && 'select-none',
                    col.headerClassName,
                  )}
                >
                  {col.sortable ? (
                    <button
                      type="button"
                      onClick={() => handleHeaderClick(col)}
                      className={cn(
                        'group inline-flex items-center gap-1.5 rounded px-0.5 -mx-0.5 transition-colors',
                        'hover:text-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-300',
                        activeSortKey === col.key ? 'text-primary-700' : 'text-gray-500',
                        alignClass(col.align) === 'text-right' && 'flex-row-reverse',
                      )}
                    >
                      {col.header}
                      <SortIcon active={activeSortKey === col.key} dir={activeSortDir} />
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              ))}
            </tr>
          </thead>

          {/* ── Body ─────────────────────────────────────────────────────── */}
          <tbody>
            {loading ? (
              Array.from({ length: skeletonRows }).map((_, i) => (
                <tr key={i} className="border-b border-gray-100">
                  {selectable && <td className="py-3 pl-4 pr-2"><Skeleton className="h-4 w-4 rounded" /></td>}
                  {columns.map(col => (
                    <td key={col.key} className="py-3 px-3">
                      <Skeleton className={cn('h-3.5 rounded', col.skeletonWidth ?? 'w-28')} />
                    </td>
                  ))}
                </tr>
              ))
            ) : displayData.length === 0 ? (
              <tr>
                <td
                  colSpan={totalCols}
                  className="py-16 text-center text-gray-400"
                >
                  {emptyNode ?? (
                    <div className="flex flex-col items-center gap-1.5">
                      <span className="text-sm">{emptyText}</span>
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              displayData.map((row, i) => {
                const key = rowKey(row)
                const isSelected = selectedKeys?.has(key)
                return (
                  <tr
                    key={key}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={cn(
                      'border-b border-gray-100 transition-colors',
                      onRowClick && 'cursor-pointer',
                      isSelected
                        ? 'bg-primary-50/60'
                        : i % 2 === 0
                        ? 'bg-white hover:bg-gray-50/70'
                        : 'bg-gray-50/30 hover:bg-gray-100/60',
                      rowClassName?.(row, i),
                    )}
                  >
                    {selectable && (
                      <td className="py-2.5 pl-4 pr-2" onClick={e => e.stopPropagation()}>
                        <Checkbox
                          checked={!!isSelected}
                          onCheckedChange={checked => onSelectRow?.(key, !!checked)}
                          className="border-gray-300"
                        />
                      </td>
                    )}
                    {columns.map(col => (
                      <td
                        key={col.key}
                        className={cn(
                          'py-2.5 px-3 align-middle',
                          alignClass(col.align),
                          col.className,
                        )}
                      >
                        <div className={cn('flex items-center', flexAlignClass(col.align))}>
                          {col.render
                            ? col.render(row, i)
                            : col.accessor != null
                            ? String(row[col.accessor] ?? '—')
                            : null}
                        </div>
                      </td>
                    ))}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
