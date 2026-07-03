import { escapeHtml as e, printRow as row, renderPrintHeader, renderPrintFooter, openPrintDocument, type PrintClinicInfo } from '@/lib/print/printDocument'
import { resolvePrintLayout } from '@/lib/print/layouts'

export interface OpdReceiptData extends PrintClinicInfo {
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
}

export function printOpdReceipt(data: OpdReceiptData) {
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
  const showTax  = taxAmt > 0

  const chargeRows = data.charges.map((c, i) => `
    <tr>
      <td class="pt-col">${i + 1}</td>
      <td class="pt-desc">${e(c.name)}</td>
      ${showTax ? `<td class="pt-tax">${taxAmt.toFixed(2)} (${taxPct.toFixed(2)}%)</td>` : ''}
      <td class="pt-amt">${netAmt.toFixed(2)}</td>
    </tr>
  `).join('')

  const bodyHtml = `
  ${renderPrintHeader(data, { barLabel: 'OPD Bill' })}

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

  <div class="payment-title">Payment Details</div>
  <hr />

  <table class="pay-table">
    <thead>
      <tr>
        <th class="pt-col">#</th>
        <th class="pt-desc">Description</th>
        ${showTax ? '<th class="pt-tax">Tax (%)</th>' : ''}
        <th class="pt-amt">Amount (&#8377;)</th>
      </tr>
    </thead>
    <tbody>
      ${chargeRows || `<tr><td colspan="${showTax ? 4 : 3}" style="padding:8px 6px;color:#888;text-align:center">—</td></tr>`}
    </tbody>
  </table>

  <div class="summary">
    <div class="s-row">
      <span class="s-label">Amount</span>
      <span class="s-val">&#8377;${applied.toFixed(2)}</span>
    </div>
    <div class="s-row">
      <span class="s-label">Discount</span>
      <span class="s-val">&#8377;${disc.toFixed(2)} (${disc > 0 ? ((disc / applied) * 100).toFixed(2) : '0.00'}%)</span>
    </div>
    ${showTax ? `<div class="s-row">
      <span class="s-label">Tax</span>
      <span class="s-val">&#8377;${taxAmt.toFixed(2)} (${taxPct.toFixed(2)}%)</span>
    </div>` : ''}
    <div class="s-row s-net">
      <span class="s-label">Net Amount</span>
      <span class="s-val">&#8377;${netAmt.toFixed(2)}</span>
    </div>
  </div>

  ${renderPrintFooter()}
  `

  openPrintDocument({
    title: `OPD Bill – ${data.clinicName}`,
    extraStyles: '.pay-table .pt-tax { width: 130px; } .pay-table .pt-amt { width: 110px; }',
    bodyHtml,
    layout: resolvePrintLayout(data.printLayouts, 'opd'),
  })
}
