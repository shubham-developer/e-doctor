export interface PharmacyBillReceiptData {
  billNumber: number
  billDate: string
  caseId?: string
  prescriptionNo?: string
  patientName?: string
  patientCode?: string
  doctorName?: string
  lines: {
    medicineName: string
    batchNo?: string
    expiryDate?: string
    quantity: number
    salePrice: number
    taxPercent: number
    discountPercent: number
    amount: number
  }[]
  totalAmount: number
  discountAmount: number
  taxAmount: number
  netAmount: number
  paidAmount: number
  paymentMode: string
  clinicName: string
  clinicAddress?: string
  clinicPhone?: string
  clinicEmail?: string
  clinicWebsite?: string
  logoUrl?: string
}

function e(str: unknown) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function row(label: string, value: string) {
  return `<tr>
    <td class="lbl">${e(label)}</td>
    <td class="sep">:</td>
    <td class="val">${value || '&nbsp;'}</td>
  </tr>`
}

export function printPharmacyBillReceipt(data: PharmacyBillReceiptData) {
  const win = window.open('', '_blank', 'width=860,height=1100,menubar=no,toolbar=no,scrollbars=yes')
  if (!win) return

  const billId = `PHARMAB${data.billNumber}`
  const patientLabel = data.patientCode
    ? `${e(data.patientName || '—')} (${e(data.patientCode)})`
    : e(data.patientName || '—')

  const balance = Math.max(0, data.netAmount - data.paidAmount)

  const lineRows = data.lines.map((l, i) => `
    <tr>
      <td class="pt-col">${i + 1}</td>
      <td class="pt-desc">${e(l.medicineName)}${l.batchNo ? `<div style="font-size:10.5px;color:#777">Batch: ${e(l.batchNo)}${l.expiryDate ? ` · Exp: ${e(l.expiryDate)}` : ''}</div>` : ''}</td>
      <td class="pt-qty">${l.quantity}</td>
      <td class="pt-rate">${l.salePrice.toFixed(2)}</td>
      <td class="pt-tax">${l.taxPercent > 0 ? `${l.taxPercent.toFixed(2)}%` : '—'}</td>
      <td class="pt-amt">${l.amount.toFixed(2)}</td>
    </tr>
  `).join('')

  const clinicRight = [
    data.clinicAddress ? `<div>Address: ${e(data.clinicAddress)}</div>` : '',
    data.clinicPhone   ? `<div>Phone No.: ${e(data.clinicPhone)}</div>` : '',
    data.clinicEmail   ? `<div>Email: ${e(data.clinicEmail)}</div>`     : '',
    data.clinicWebsite ? `<div>Website: ${e(data.clinicWebsite)}</div>` : '',
  ].filter(Boolean).join('')

  win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Pharmacy Bill – ${e(data.clinicName)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 12.5px;
      color: #222;
      background: #fff;
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      padding: 14mm 18mm 18mm;
    }
    .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 10px; }
    .logo-badge { display: inline-block; background: #e8003d; color: #fff; font-size: 10px; font-weight: bold; padding: 2px 7px; letter-spacing: 1px; margin-bottom: 4px; }
    .hospital-name { font-size: 22px; font-weight: bold; color: #111; line-height: 1.2; }
    .contact-info { text-align: right; font-size: 11px; line-height: 1.8; color: #444; }
    .bill-bar { background: #1a1a1a; color: #fff; text-align: center; font-size: 13px; font-weight: bold; padding: 6px 0; margin: 10px 0 12px; letter-spacing: 1px; }
    .info-grid { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
    .info-grid td { padding: 2.5px 0; vertical-align: top; }
    .info-grid .lbl { color: #cc2200; font-weight: 600; white-space: nowrap; width: 1%; padding-right: 0; font-size: 12px; }
    .info-grid .sep { padding: 0 6px; color: #888; width: 1%; }
    .info-grid .val { color: #111; font-size: 12px; }
    .info-3col { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0 10px; margin-bottom: 2px; }
    .info-3col table { width: 100%; border-collapse: collapse; }
    hr { border: 0; border-top: 1px solid #bbb; margin: 10px 0; }
    .payment-title { font-size: 15px; font-weight: bold; margin-bottom: 6px; }
    .pay-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
    .pay-table thead tr { border-bottom: 2px solid #333; }
    .pay-table th { font-size: 11.5px; font-weight: bold; padding: 6px 6px; background: #f4f4f4; text-align: left; }
    .pay-table th:last-child, .pay-table td:last-child { text-align: right; }
    .pay-table td { padding: 7px 6px; font-size: 12px; border-bottom: 1px solid #eee; }
    .pay-table .pt-col  { width: 30px; }
    .pay-table .pt-qty, .pay-table .pt-rate, .pay-table .pt-tax { text-align: right; }
    .pay-table .pt-desc { color: #1a56db; }
    .summary { display: flex; flex-direction: column; align-items: flex-end; gap: 3px; margin-top: 6px; }
    .s-row { display: flex; gap: 40px; font-size: 12px; }
    .s-label { min-width: 90px; text-align: right; color: #444; }
    .s-val   { min-width: 80px; text-align: right; }
    .s-net { border-top: 1.5px solid #333; padding-top: 4px; margin-top: 2px; font-weight: bold; font-size: 13px; }
    .footer { margin-top: 30px; font-size: 11px; color: #0055bb; }
    @media print { body { padding: 10mm 14mm; } @page { size: A4; margin: 0; } }
  </style>
</head>
<body>

  <div class="header">
    <div class="logo-area">
      ${data.logoUrl
        ? `<img src="${data.logoUrl}" alt="logo" style="height:60px;max-width:180px;object-fit:contain;display:block;margin-bottom:4px" />`
        : `<div class="logo-badge">&#9651; ${e(data.clinicName.split(' ')[0].toUpperCase())}</div>`
      }
      <div class="hospital-name">${e(data.clinicName)}</div>
    </div>
    <div class="contact-info">${clinicRight}</div>
  </div>

  <div class="bill-bar">Pharmacy Bill</div>

  <div class="info-3col">
    <table class="info-grid">
      ${row('Bill No', billId)}
      ${row('Patient Name', patientLabel)}
      ${row('Consultant Doctor', data.doctorName || '—')}
    </table>
    <table class="info-grid">
      ${row('Case ID', data.caseId || '—')}
      ${row('Prescription No', data.prescriptionNo || '—')}
    </table>
    <table class="info-grid">
      ${row('Bill Date', data.billDate)}
      ${row('Payment Mode', data.paymentMode || '—')}
    </table>
  </div>

  <hr />

  <div class="payment-title">Medicine Details</div>
  <hr />

  <table class="pay-table">
    <thead>
      <tr>
        <th class="pt-col">#</th>
        <th class="pt-desc">Medicine</th>
        <th class="pt-qty">Qty</th>
        <th class="pt-rate">Rate</th>
        <th class="pt-tax">Tax</th>
        <th>Amount</th>
      </tr>
    </thead>
    <tbody>
      ${lineRows || `<tr><td colspan="6" style="padding:8px 6px;color:#888;text-align:center">—</td></tr>`}
    </tbody>
  </table>

  <div class="summary">
    <div class="s-row"><span class="s-label">Total</span><span class="s-val">${data.totalAmount.toFixed(2)}</span></div>
    <div class="s-row"><span class="s-label">Discount</span><span class="s-val">${data.discountAmount.toFixed(2)}</span></div>
    <div class="s-row"><span class="s-label">Tax</span><span class="s-val">${data.taxAmount.toFixed(2)}</span></div>
    <div class="s-row s-net"><span class="s-label">Net Amount</span><span class="s-val">${data.netAmount.toFixed(2)}</span></div>
    <div class="s-row"><span class="s-label">Paid</span><span class="s-val">${data.paidAmount.toFixed(2)}</span></div>
    <div class="s-row"><span class="s-label">Balance</span><span class="s-val">${balance.toFixed(2)}</span></div>
  </div>

  <div class="footer">This invoice is printed electronically, so <u>no signature is required</u></div>

  <script>
    window.onload = function () { setTimeout(function () { window.print() }, 300) }
  </script>
</body>
</html>`)

  win.document.close()
}
