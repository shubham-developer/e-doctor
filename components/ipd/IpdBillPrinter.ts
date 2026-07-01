import { formatAmount } from '@/lib/context'

export interface IpdBillData {
  ipdNumber: number
  admissionDate: string
  dischargeDate?: string
  caseNumber?: string
  bedNumber?: string
  bedGroup?: string
  // patient
  patientName: string
  patientCode?: number
  patientAge?: number
  patientAgeMonths?: number
  patientAgeDays?: number
  patientGender?: string
  patientPhone?: string
  patientBloodGroup?: string
  // doctor
  doctorName?: string
  doctorSpecialization?: string
  // charges
  charges: { categoryName: string; quantity: number; unitPrice: number; total: number; date: string; note?: string }[]
  totalCharges: number
  // payment receipt
  payment: { amount: number; paymentMode: string; note?: string; date: string; addedByName?: string }
  totalPaid: number
  balance: number
  // currency
  currency?: string
  currencySymbol?: string
  // clinic
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

export function printIpdBill(data: IpdBillData) {
  const win = window.open('', '_blank', 'width=860,height=1100,menubar=no,toolbar=no,scrollbars=yes')
  if (!win) return

  const ipdId  = `IPDN${String(data.ipdNumber).padStart(4, '0')}`
  const symbol = data.currencySymbol ?? '₹'
  const fmt    = (n: number) => `${symbol}${formatAmount(n, data.currency)}`

  const patientLabel = data.patientCode
    ? `${e(data.patientName)} (${data.patientCode})`
    : e(data.patientName)

  const ageStr = [
    data.patientAge       ? `${data.patientAge} Year`       : '',
    data.patientAgeMonths ? `${data.patientAgeMonths} Month` : '',
    data.patientAgeDays   ? `${data.patientAgeDays} Day`    : '',
  ].filter(Boolean).join(', ') || '—'

  const bedLabel = [data.bedNumber, data.bedGroup].filter(Boolean).join(' – ') || '—'

  const chargeRows = data.charges.map((c, i) => `
    <tr>
      <td class="pt-col">${i + 1}</td>
      <td class="pt-desc">${e(c.categoryName)}${c.note ? `<div style="font-size:10.5px;color:#777">${e(c.note)}</div>` : ''}</td>
      <td class="pt-qty">${c.quantity}</td>
      <td class="pt-rate">${fmt(c.unitPrice)}</td>
      <td class="pt-amt">${fmt(c.total)}</td>
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
  <title>IPD Bill – ${e(ipdId)}</title>
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
    .info-grid { width: 100%; border-collapse: collapse; }
    .info-grid td { padding: 2.5px 0; vertical-align: top; }
    .info-grid .lbl { color: #cc2200; font-weight: 600; white-space: nowrap; width: 1%; padding-right: 0; font-size: 12px; }
    .info-grid .sep { padding: 0 6px; color: #888; width: 1%; }
    .info-grid .val { color: #111; font-size: 12px; }
    .info-3col { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0 10px; margin-bottom: 12px; }
    .info-3col table { width: 100%; border-collapse: collapse; }
    hr { border: 0; border-top: 1px solid #bbb; margin: 10px 0; }
    .section-title { font-size: 15px; font-weight: bold; margin-bottom: 6px; }
    .pay-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
    .pay-table thead tr { border-bottom: 2px solid #333; }
    .pay-table th { font-size: 11.5px; font-weight: bold; padding: 6px 6px; background: #f4f4f4; text-align: left; }
    .pay-table th.tr, .pay-table td.tr { text-align: right; }
    .pay-table td { padding: 7px 6px; font-size: 12px; border-bottom: 1px solid #eee; }
    .pay-table .pt-col  { width: 30px; }
    .pay-table .pt-qty, .pay-table .pt-rate { text-align: right; }
    .pay-table .pt-amt  { text-align: right; }
    .pay-table .pt-desc { color: #1a56db; }
    .summary { display: flex; flex-direction: column; align-items: flex-end; gap: 3px; margin-top: 6px; margin-bottom: 20px; }
    .s-row { display: flex; gap: 40px; font-size: 12px; }
    .s-label { min-width: 110px; text-align: right; color: #444; }
    .s-val   { min-width: 90px; text-align: right; }
    .s-net { border-top: 1.5px solid #333; padding-top: 4px; margin-top: 2px; font-weight: bold; font-size: 13px; }
    .receipt-box { border: 1.5px solid #1a56db; border-radius: 6px; padding: 12px 16px; margin-top: 16px; }
    .receipt-box .title { font-size: 13px; font-weight: bold; color: #1a56db; margin-bottom: 8px; }
    .receipt-row { display: flex; justify-content: space-between; font-size: 12px; padding: 2px 0; }
    .receipt-row .rl { color: #555; } .receipt-row .rv { font-weight: 600; color: #111; }
    .balance-row .rv { color: ${data.balance <= 0 ? '#16a34a' : '#dc2626'}; }
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

  <div class="bill-bar">IPD Bill</div>

  <div class="info-3col">
    <table class="info-grid">
      ${row('IPD No', ipdId)}
      ${row('Patient Name', patientLabel)}
      ${row('Age / Gender', ageStr + (data.patientGender ? ' / ' + e(data.patientGender) : ''))}
      ${row('Blood Group', data.patientBloodGroup || '')}
    </table>
    <table class="info-grid">
      ${row('Phone', data.patientPhone || '')}
      ${row('Consultant', data.doctorName || '')}
      ${row('Department', data.doctorSpecialization || '')}
    </table>
    <table class="info-grid">
      ${row('Admission Date', e(data.admissionDate))}
      ${data.dischargeDate ? row('Discharge Date', e(data.dischargeDate)) : ''}
      ${row('Bed', bedLabel)}
      ${row('Case No', data.caseNumber || '')}
    </table>
  </div>

  <hr />

  <div class="section-title">Charge Details</div>
  <hr />

  <table class="pay-table">
    <thead>
      <tr>
        <th class="pt-col">#</th>
        <th class="pt-desc">Description</th>
        <th class="tr">Qty</th>
        <th class="tr">Unit Price</th>
        <th class="tr">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${chargeRows || `<tr><td colspan="5" style="padding:8px 6px;color:#888;text-align:center">No charges added</td></tr>`}
    </tbody>
  </table>

  <div class="summary">
    <div class="s-row">
      <span class="s-label">Total Charges</span>
      <span class="s-val">${fmt(data.totalCharges)}</span>
    </div>
    <div class="s-row">
      <span class="s-label">Total Paid</span>
      <span class="s-val">${fmt(data.totalPaid)}</span>
    </div>
    <div class="s-row s-net">
      <span class="s-label">${data.balance <= 0 ? 'Fully Paid' : 'Balance Due'}</span>
      <span class="s-val" style="color:${data.balance <= 0 ? '#16a34a' : '#dc2626'}">${fmt(Math.abs(data.balance))}</span>
    </div>
  </div>

  <div class="receipt-box">
    <div class="title">&#10003; Payment Receipt</div>
    <div class="receipt-row"><span class="rl">Date</span><span class="rv">${e(data.payment.date)}</span></div>
    <div class="receipt-row"><span class="rl">Payment Mode</span><span class="rv">${e(data.payment.paymentMode)}</span></div>
    <div class="receipt-row"><span class="rl">Amount Received</span><span class="rv">${fmt(data.payment.amount)}</span></div>
    ${data.payment.note ? `<div class="receipt-row"><span class="rl">Note</span><span class="rv">${e(data.payment.note)}</span></div>` : ''}
    ${data.payment.addedByName ? `<div class="receipt-row"><span class="rl">Received By</span><span class="rv">${e(data.payment.addedByName)}</span></div>` : ''}
    <div class="receipt-row balance-row" style="margin-top:6px;padding-top:6px;border-top:1px solid #c7d2fe">
      <span class="rl">${data.balance <= 0 ? 'Balance' : 'Remaining Balance'}</span>
      <span class="rv">${fmt(Math.abs(data.balance))}</span>
    </div>
  </div>

  <div class="footer">This invoice is printed electronically, so <u>no signature is required</u></div>

  <script>
    window.onload = function () { setTimeout(function () { window.print() }, 300) }
  </script>
</body>
</html>`)

  win.document.close()
}
