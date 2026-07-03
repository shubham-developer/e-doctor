'use client'

import { format } from 'date-fns'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { useApp, formatAmount } from '@/lib/context'
import type { PharmacyBill } from './types'

export function BillDetailsModal({
  bill,
  onClose,
  onPay,
}: {
  bill: PharmacyBill | null
  onClose: () => void
  onPay: () => void
}) {
  const { tenant } = useApp()
  const symbol = tenant?.currencySymbol || '₹'
  const fmt = (n: number) => symbol + formatAmount(n, tenant?.currency)
  const balance = bill ? Math.max(0, bill.netAmount - bill.paidAmount) : 0

  return (
    <Dialog
      open={!!bill}
      onOpenChange={(v) => {
        if (!v) onClose()
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-none sm:w-[min(92vw,900px)] p-0 overflow-hidden gap-0"
      >
        <div className="bg-primary-600 text-white flex items-center justify-between px-5 py-3.5">
          <DialogTitle>
            Bill PHARMAB{bill?.billNumber}
          </DialogTitle>
          <button
            type="button"
            onClick={onClose}
            className="text-white hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4 max-h-[75vh] overflow-y-auto">
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div>
              <span className="block text-gray-500">Patient</span>
              <span className="font-medium">
                {bill?.patientId
                  ? `${bill.patientId.name}${bill.patientId.patientCode ? ` (${bill.patientId.patientCode})` : ''}`
                  : '—'}
              </span>
            </div>
            <div>
              <span className="block text-gray-500">Doctor</span>
              <span className="font-medium">
                {bill?.doctorId?.name ?? bill?.doctorName ?? '—'}
              </span>
            </div>
            <div>
              <span className="block text-gray-500">Date</span>
              <span className="font-medium">
                {bill
                  ? format(new Date(bill.createdAt), 'MM/dd/yyyy hh:mm a')
                  : '—'}
              </span>
            </div>
            <div>
              <span className="block text-gray-500">Case ID</span>
              <span className="font-medium">{bill?.caseId || '—'}</span>
            </div>
            <div>
              <span className="block text-gray-500">
                Prescription No
              </span>
              <span className="font-medium">{bill?.prescriptionNo || '—'}</span>
            </div>
            <div>
              <span className="block text-gray-500">Payment Mode</span>
              <span className="font-medium">{bill?.paymentMode || '—'}</span>
            </div>
          </div>

          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-200">
                {[
                  { label: 'Medicine', align: 'text-left' },
                  { label: 'Batch No', align: 'text-left' },
                  { label: 'Expiry', align: 'text-left' },
                  { label: 'Qty', align: 'text-right' },
                  { label: 'Sale Price', align: 'text-right' },
                  { label: 'Tax (%)', align: 'text-right' },
                  { label: 'Discount (%)', align: 'text-right' },
                  { label: 'Amount', align: 'text-right' },
                ].map((h) => (
                  <th
                    key={h.label}
                    className={`${h.align} py-2 pr-2 font-medium text-gray-600 whitespace-nowrap`}
                  >
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(bill?.lines ?? []).map((ln, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-1.5 pr-2">{ln.medicineName}</td>
                  <td className="py-1.5 pr-2 text-gray-500">
                    {ln.batchNo || '—'}
                  </td>
                  <td className="py-1.5 pr-2 text-gray-500">
                    {ln.expiryDate || '—'}
                  </td>
                  <td className="py-1.5 pr-2 text-right">{ln.quantity}</td>
                  <td className="py-1.5 pr-2 text-right">
                    {fmt(ln.salePrice)}
                  </td>
                  <td className="py-1.5 pr-2 text-right">{ln.taxPercent}</td>
                  <td className="py-1.5 pr-2 text-right">
                    {ln.discountPercent}
                  </td>
                  <td className="py-1.5 pr-2 text-right font-medium">
                    {fmt(ln.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end">
            <div className="space-y-1 w-64">
              {[
                { label: 'Total', value: fmt(bill?.totalAmount ?? 0) },
                { label: 'Discount', value: fmt(bill?.discountAmount ?? 0) },
                { label: 'Tax', value: fmt(bill?.taxAmount ?? 0) },
                { label: 'Net Amount', value: fmt(bill?.netAmount ?? 0) },
                { label: 'Paid', value: fmt(bill?.paidAmount ?? 0) },
                { label: 'Balance', value: fmt(balance) },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between border-b border-gray-100 py-1"
                >
                  <span className="text-xs text-gray-600">{row.label}</span>
                  <span className="text-xs font-medium">{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          {bill?.note && (
            <div>
              <span className="block text-xs font-medium text-gray-600 mb-1">
                Note
              </span>
              <p className="text-xs text-gray-700">{bill.note}</p>
            </div>
          )}

          {(bill?.payments?.length ?? 0) > 0 && (
            <div>
              <span className="block text-xs font-medium text-gray-600 mb-1">
                Payment History
              </span>
              <div className="border rounded divide-y">
                {bill!.payments.map((p, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-3 py-1.5 text-xs"
                  >
                    <span className="text-gray-500">
                      {format(new Date(p.createdAt), 'MM/dd/yyyy hh:mm a')}
                    </span>
                    <span className="text-gray-600">{p.mode}</span>
                    {p.note && (
                      <span className="text-gray-400 truncate">{p.note}</span>
                    )}
                    <span className="font-medium">{fmt(p.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="border-t px-5 py-3 flex justify-end gap-2">
          {balance > 0 && (
            <Button variant="outline" onClick={onPay}>
              Add Payment
            </Button>
          )}
          <Button onClick={onClose} className="bg-primary-600 hover:bg-primary-700">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
