export interface PathologyBillReceiptData {
  billNo: string
  billDate: string
  caseId?: string
  patientName?: string
  patientCode?: string
  referenceDoctor?: string
  note?: string
  previousReportValue?: string
  items: {
    testName: string
    reportDate?: string
    charge: number
    tax: number
    amount: number
  }[]
  totalAmount: number
  discountAmount: number
  taxAmount: number
  netAmount: number
  paidAmount: number
  balance: number
  paymentMode?: string
  clinicName: string
  clinicAddress?: string
  clinicPhone?: string
  clinicEmail?: string
  logoUrl?: string
  currencySymbol?: string
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

export function printPathologyBillReceipt(data: PathologyBillReceiptData) {
  const win = window.open('', '_blank', 'width=860,height=1100,menubar=no,toolbar=no,scrollbars=yes')
  if (!win) return

  const sym          = data.currencySymbol ?? '₹'
  const patientLabel = data.patientCode
    ? `${e(data.patientName || '—')} (${e(data.patientCode)})`
    : e(data.patientName || '—')

  const itemRows = data.items.map((item, i) => `
    <tr>
      <td class="pt-col">${i + 1}</td>
      <td class="pt-desc">${e(item.testName)}</td>
      <td class="pt-date">${e(item.reportDate || '—')}</td>
      <td class="pt-num">${item.tax > 0 ? `${item.tax.toFixed(2)}%` : '—'}</td>
      <td class="pt-num">${sym}${item.charge.toFixed(2)}</td>
      <td class="pt-num">${sym}${item.amount.toFixed(2)}</td>
    </tr>
  `).join('')

  const clinicRight = [
    data.clinicAddress ? `<div>${e(data.clinicAddress)}</div>` : '',
    data.clinicPhone   ? `<div>Phone: ${e(data.clinicPhone)}</div>` : '',
    data.clinicEmail   ? `<div>Email: ${e(data.clinicEmail)}</div>` : '',
  ].filter(Boolean).join('')

  win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Pathology Bill – ${e(data.clinicName)}</title>
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
    .hospital-name { font-size: 22px; font-weight: bold; color: #111; line-height: 1.2; }
    .contact-info { text-align: right; font-size: 11px; line-height: 1.8; color: #444; }
    .bill-bar { background: #1a5276; color: #fff; text-align: center; font-size: 13px; font-weight: bold; padding: 6px 0; margin: 10px 0 12px; letter-spacing: 1px; }
    .info-3col { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0 10px; margin-bottom: 2px; }
    .info-grid { width: 100%; border-collapse: collapse; }
    .info-grid td { padding: 2.5px 0; vertical-align: top; }
    .info-grid .lbl { color: #cc2200; font-weight: 600; white-space: nowrap; width: 1%; padding-right: 0; font-size: 12px; }
    .info-grid .sep { padding: 0 6px; color: #888; width: 1%; }
    .info-grid .val { color: #111; font-size: 12px; }
    hr { border: 0; border-top: 1px solid #bbb; margin: 10px 0; }
    .section-title { font-size: 14px; font-weight: bold; margin-bottom: 6px; }
    .pay-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
    .pay-table thead tr { background: #f4f4f4; border-bottom: 2px solid #333; }
    .pay-table th { font-size: 11.5px; font-weight: bold; padding: 6px 8px; text-align: left; }
    .pay-table th.pt-num, .pay-table td.pt-num { text-align: right; }
    .pay-table td { padding: 7px 8px; font-size: 12px; border-bottom: 1px solid #eee; }
    .pay-table .pt-col  { width: 30px; }
    .pay-table .pt-date { width: 90px; }
    .pay-table .pt-num  { width: 90px; }
    .pay-table .pt-desc { color: #1a56db; }
    .summary { display: flex; flex-direction: column; align-items: flex-end; gap: 3px; margin-top: 8px; }
    .s-row { display: flex; gap: 40px; font-size: 12px; }
    .s-label { min-width: 100px; text-align: right; color: #444; }
    .s-val   { min-width: 90px; text-align: right; }
    .s-net { border-top: 1.5px solid #333; padding-top: 4px; margin-top: 2px; font-weight: bold; font-size: 13.5px; }
    .note-box { margin-top: 14px; padding: 8px 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 11.5px; color: #444; }
    .footer { margin-top: 30px; font-size: 11px; color: #0055bb; }
    @media print { body { padding: 10mm 14mm; } @page { size: A4; margin: 0; } }
  </style>
</head>
<body>

  <div class="header">
    <div class="logo-area">
      ${data.logoUrl
        ? `<img src="${data.logoUrl}" alt="logo" style="height:60px;max-width:180px;object-fit:contain;display:block;margin-bottom:4px" />`
        : `<div style="display:inline-block;background:#1a5276;color:#fff;font-size:10px;font-weight:bold;padding:2px 7px;letter-spacing:1px;margin-bottom:4px">&#9651; ${e(data.clinicName.split(' ')[0].toUpperCase())}</div>`
      }
      <div class="hospital-name">${e(data.clinicName)}</div>
    </div>
    <div class="contact-info">${clinicRight}</div>
  </div>

  <div class="bill-bar">Pathology Bill</div>

  <div class="info-3col">
    <table class="info-grid">
      ${row('Bill No', e(data.billNo))}
      ${row('Patient', patientLabel)}
      ${row('Ref. Doctor', e(data.referenceDoctor || '—'))}
    </table>
    <table class="info-grid">
      ${row('Case ID', e(data.caseId || '—'))}
      ${row('Payment Mode', e(data.paymentMode || 'Cash'))}
    </table>
    <table class="info-grid">
      ${row('Bill Date', e(data.billDate))}
      ${row('Paid', sym + data.paidAmount.toFixed(2))}
      ${row('Balance', sym + data.balance.toFixed(2))}
    </table>
  </div>

  <hr />
  <div class="section-title">Test Details</div>
  <hr />

  <table class="pay-table">
    <thead>
      <tr>
        <th class="pt-col">#</th>
        <th class="pt-desc">Test Name</th>
        <th class="pt-date">Report Date</th>
        <th class="pt-num">Tax %</th>
        <th class="pt-num">Charge (${sym})</th>
        <th class="pt-num">Amount (${sym})</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows || `<tr><td colspan="6" style="padding:8px;color:#888;text-align:center">—</td></tr>`}
    </tbody>
  </table>

  <div class="summary">
    <div class="s-row"><span class="s-label">Total</span><span class="s-val">${sym}${data.totalAmount.toFixed(2)}</span></div>
    <div class="s-row"><span class="s-label">Discount</span><span class="s-val">${sym}${data.discountAmount.toFixed(2)}</span></div>
    <div class="s-row"><span class="s-label">Tax</span><span class="s-val">${sym}${data.taxAmount.toFixed(2)}</span></div>
    <div class="s-row s-net"><span class="s-label">Net Amount</span><span class="s-val">${sym}${data.netAmount.toFixed(2)}</span></div>
    <div class="s-row"><span class="s-label">Paid</span><span class="s-val">${sym}${data.paidAmount.toFixed(2)}</span></div>
    <div class="s-row"><span class="s-label">Balance</span><span class="s-val">${sym}${data.balance.toFixed(2)}</span></div>
  </div>

  ${data.note ? `<div class="note-box"><strong>Note:</strong> ${e(data.note)}</div>` : ''}
  ${data.previousReportValue ? `<div class="note-box"><strong>Previous Report Value:</strong> ${e(data.previousReportValue)}</div>` : ''}

  <div class="footer">This invoice is printed electronically, so <u>no signature is required</u></div>

  <script>
    window.onload = function () { setTimeout(function () { window.print() }, 300) }
  </script>
</body>
</html>`)

  win.document.close()
}
