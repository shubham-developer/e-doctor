export interface OpdReceiptData {
  // visit
  opdNumber: number
  caseNumber?: string
  visitDate: string
  visitTime: string
  // patient
  patientName: string
  patientCode?: number
  patientAge: number
  patientAgeMonths?: number
  patientAgeDays?: number
  patientGender?: string
  patientBloodGroup?: string
  patientAllergies?: string
  patientAddress?: string
  previousMedicalIssue?: string
  // doctor
  doctorName?: string
  doctorSpecialization?: string
  // clinical
  chiefComplaint: string
  // billing
  charges: { name: string; fee: number }[]
  appliedCharge?: number
  discount?: number
  tax?: number
  totalFee: number
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

export function printOpdReceipt(data: OpdReceiptData) {
  const win = window.open('', '_blank', 'width=860,height=1100,menubar=no,toolbar=no,scrollbars=yes')
  if (!win) return

  const opdId    = `OPDN${String(data.opdNumber).padStart(4, '0')}`
  const checkId  = data.caseNumber ? `CHKID${e(data.caseNumber)}` : `CHKID${String(data.opdNumber).padStart(4, '0')}`
  const apptDate = `${e(data.visitDate)} ${e(data.visitTime)}`

  const patientLabel = data.patientCode
    ? `${e(data.patientName)} (${data.patientCode})`
    : e(data.patientName)

  const ageStr = [
    data.patientAge      ? `${data.patientAge} Year`      : '',
    data.patientAgeMonths ? `${data.patientAgeMonths} Month` : '',
    data.patientAgeDays   ? `${data.patientAgeDays} Day`    : '',
  ].filter(Boolean).join(', ') || '—'

  const doctorLabel = data.doctorName ? e(data.doctorName) : '—'

  // Billing
  const applied  = data.appliedCharge ?? data.totalFee ?? 0
  const disc     = data.discount ?? 0
  const taxPct   = data.tax ?? 0
  const taxAmt   = (applied - disc) * taxPct / 100
  const netAmt   = applied - disc + taxAmt

  const chargeRows = data.charges.map((c, i) => `
    <tr>
      <td class="pt-col">${i + 1}</td>
      <td class="pt-desc">${e(c.name)}</td>
      <td class="pt-tax">${taxAmt > 0 ? `${taxAmt.toFixed(2)} (${taxPct.toFixed(2)}%)` : '—'}</td>
      <td class="pt-amt">${netAmt.toFixed(2)}</td>
    </tr>
  `).join('')

  // Clinic contact
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
  <title>OPD Bill – ${e(data.clinicName)}</title>
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

    /* ── Header ── */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 10px;
    }
    .logo-area {}
    .logo-badge {
      display: inline-block;
      background: #e8003d;
      color: #fff;
      font-size: 10px;
      font-weight: bold;
      padding: 2px 7px;
      letter-spacing: 1px;
      margin-bottom: 4px;
    }
    .hospital-name {
      font-size: 22px;
      font-weight: bold;
      color: #111;
      line-height: 1.2;
    }
    .contact-info {
      text-align: right;
      font-size: 11px;
      line-height: 1.8;
      color: #444;
    }

    /* ── Bill title bar ── */
    .bill-bar {
      background: #1a1a1a;
      color: #fff;
      text-align: center;
      font-size: 13px;
      font-weight: bold;
      padding: 6px 0;
      margin: 10px 0 12px;
      letter-spacing: 1px;
    }

    /* ── Info table ── */
    .info-grid {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
    }
    .info-grid td { padding: 2.5px 0; vertical-align: top; }
    .info-grid .lbl {
      color: #cc2200;
      font-weight: 600;
      white-space: nowrap;
      width: 1%;
      padding-right: 0;
      font-size: 12px;
    }
    .info-grid .sep {
      padding: 0 6px;
      color: #888;
      width: 1%;
    }
    .info-grid .val {
      color: #111;
      font-size: 12px;
    }
    .info-3col {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 0 10px;
      margin-bottom: 2px;
    }
    .info-3col table { width: 100%; border-collapse: collapse; }

    hr { border: 0; border-top: 1px solid #bbb; margin: 10px 0; }

    /* ── Payment section ── */
    .payment-title {
      font-size: 15px;
      font-weight: bold;
      margin-bottom: 6px;
    }
    .pay-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
    }
    .pay-table thead tr {
      border-bottom: 2px solid #333;
    }
    .pay-table th {
      font-size: 11.5px;
      font-weight: bold;
      padding: 6px 6px;
      background: #f4f4f4;
      text-align: left;
    }
    .pay-table th:last-child, .pay-table td:last-child { text-align: right; }
    .pay-table td {
      padding: 7px 6px;
      font-size: 12px;
      border-bottom: 1px solid #eee;
    }
    .pay-table .pt-col  { width: 30px; }
    .pay-table .pt-desc { color: #1a56db; }

    /* ── Summary ── */
    .summary {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 3px;
      margin-top: 6px;
    }
    .s-row {
      display: flex;
      gap: 40px;
      font-size: 12px;
    }
    .s-label { min-width: 90px; text-align: right; color: #444; }
    .s-val   { min-width: 80px; text-align: right; }
    .s-net {
      border-top: 1.5px solid #333;
      padding-top: 4px;
      margin-top: 2px;
      font-weight: bold;
      font-size: 13px;
    }

    /* ── Footer ── */
    .footer {
      margin-top: 30px;
      font-size: 11px;
      color: #0055bb;
    }

    @media print {
      body { padding: 10mm 14mm; }
      @page { size: A4; margin: 0; }
    }
  </style>
</head>
<body>

  <!-- Header -->
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

  <!-- OPD Bill bar -->
  <div class="bill-bar">OPD Bill</div>

  <!-- Info grid — 3 columns -->
  <div class="info-3col">
    <table class="info-grid">
      ${row('OPD ID', opdId)}
      ${row('Patient Name', patientLabel)}
      ${row('Blood Group', data.patientBloodGroup || '')}
      ${row('Address', data.patientAddress || '')}
      ${row('Consultant Doctor', doctorLabel)}
      ${row('Previous Medical Issue', data.previousMedicalIssue || '')}
    </table>
    <table class="info-grid">
      ${row('OPD Checkup ID', checkId)}
      ${row('Age', ageStr)}
      ${row('Known Allergies', data.patientAllergies || '')}
    </table>
    <table class="info-grid">
      ${row('Appointment Date', apptDate)}
      ${row('Gender', data.patientGender || '')}
      ${row('Department', data.doctorSpecialization || '')}
    </table>
  </div>

  <hr />

  <!-- Payment Details -->
  <div class="payment-title">Payment Details</div>
  <hr />

  <table class="pay-table">
    <thead>
      <tr>
        <th class="pt-col">#</th>
        <th class="pt-desc">Description</th>
        <th>Tax (%)</th>
        <th>Amount (&#8377;)</th>
      </tr>
    </thead>
    <tbody>
      ${chargeRows || `<tr><td colspan="4" style="padding:8px 6px;color:#888;text-align:center">—</td></tr>`}
    </tbody>
  </table>

  <!-- Summary -->
  <div class="summary">
    <div class="s-row">
      <span class="s-label">Amount</span>
      <span class="s-val">&#8377;${applied.toFixed(2)}</span>
    </div>
    <div class="s-row">
      <span class="s-label">Discount</span>
      <span class="s-val">&#8377;${disc.toFixed(2)} (${disc > 0 ? ((disc / applied) * 100).toFixed(2) : '0.00'}%)</span>
    </div>
    <div class="s-row">
      <span class="s-label">Tax</span>
      <span class="s-val">&#8377;${taxAmt.toFixed(2)} (${taxPct.toFixed(2)}%)</span>
    </div>
    <div class="s-row s-net">
      <span class="s-label">Net Amount</span>
      <span class="s-val">&#8377;${netAmt.toFixed(2)}</span>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">This invoice is printed electronically, so <u>no signature is required</u></div>

  <script>
    window.onload = function () { setTimeout(function () { window.print() }, 300) }
  </script>
</body>
</html>`)

  win.document.close()
}
