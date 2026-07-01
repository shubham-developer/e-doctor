export interface DischargeSummaryData {
  ipdNumber: number
  admissionDate: string
  dischargeDate?: string
  caseNumber?: string
  bedNumber?: string
  bedGroup?: string
  patientName: string
  patientCode?: number
  patientAge?: number
  patientAgeMonths?: number
  patientAgeDays?: number
  patientGender?: string
  patientPhone?: string
  patientBloodGroup?: string
  doctorName?: string
  doctorSpecialization?: string
  diagnosis: string
  historyOfPresentIllness?: string
  examinationFindings?: string
  investigations?: string
  treatmentGiven?: string
  proceduresPerformed?: string
  conditionAtDischarge?: string
  followUpInstructions?: string
  medicationsAtDischarge?: string
  additionalNotes?: string
  writtenByName?: string
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

function section(title: string, content?: string) {
  if (!content?.trim()) return ''
  return `
    <div class="section">
      <div class="sec-title">${e(title)}</div>
      <div class="sec-body">${e(content).replace(/\n/g, '<br/>')}</div>
    </div>
  `
}

export function printDischargeSummary(data: DischargeSummaryData) {
  const win = window.open('', '_blank', 'width=860,height=1100,menubar=no,toolbar=no,scrollbars=yes')
  if (!win) return

  const ipdId = `IPDN${String(data.ipdNumber).padStart(4, '0')}`

  const ageStr = [
    data.patientAge       ? `${data.patientAge} Year`       : '',
    data.patientAgeMonths ? `${data.patientAgeMonths} Month` : '',
    data.patientAgeDays   ? `${data.patientAgeDays} Day`    : '',
  ].filter(Boolean).join(', ') || '—'

  const patientLabel = data.patientCode
    ? `${e(data.patientName)} (${data.patientCode})`
    : e(data.patientName)

  const bedDisplay = [data.bedNumber, data.bedGroup].filter(Boolean).join(' – ') || '—'

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
  <title>Discharge Summary – ${e(data.clinicName)}</title>
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

    /* ── Sections ── */
    .section {
      margin-bottom: 12px;
      page-break-inside: avoid;
    }
    .sec-title {
      font-size: 11.5px;
      font-weight: bold;
      color: #cc2200;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid #e8d0cc;
      padding-bottom: 3px;
      margin-bottom: 5px;
    }
    .sec-body {
      font-size: 12px;
      color: #222;
      line-height: 1.6;
      white-space: pre-wrap;
    }

    /* ── Footer ── */
    .footer {
      margin-top: 30px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .footer-note {
      font-size: 11px;
      color: #0055bb;
    }
    .sig-block {
      text-align: center;
      font-size: 11px;
      color: #444;
    }
    .sig-line {
      border-top: 1px solid #555;
      width: 180px;
      margin-bottom: 4px;
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

  <!-- Discharge Summary bar -->
  <div class="bill-bar">Discharge Summary</div>

  <!-- Info grid — 3 columns -->
  <div class="info-3col">
    <table class="info-grid">
      ${row('IPD Number', ipdId)}
      ${row('Patient Name', patientLabel)}
      ${row('Blood Group', data.patientBloodGroup || '')}
      ${row('Bed', bedDisplay)}
    </table>
    <table class="info-grid">
      ${row('Case No', data.caseNumber || '')}
      ${row('Age', ageStr)}
      ${row('Gender', data.patientGender || '')}
    </table>
    <table class="info-grid">
      ${row('Admission Date', data.admissionDate || '')}
      ${row('Discharge Date', data.dischargeDate || '')}
      ${row('Consultant', data.doctorName || '')}
      ${row('Specialization', data.doctorSpecialization || '')}
    </table>
  </div>

  <hr />

  <!-- Clinical Sections -->
  ${section('Diagnosis', data.diagnosis)}
  ${section('History of Present Illness', data.historyOfPresentIllness)}
  ${section('Examination Findings', data.examinationFindings)}
  ${section('Investigations', data.investigations)}
  ${section('Treatment Given', data.treatmentGiven)}
  ${section('Procedures Performed', data.proceduresPerformed)}
  ${section('Condition at Discharge', data.conditionAtDischarge)}
  ${section('Medications at Discharge', data.medicationsAtDischarge)}
  ${section('Follow-up Instructions', data.followUpInstructions)}
  ${section('Additional Notes', data.additionalNotes)}

  <!-- Footer -->
  <div class="footer">
    <div class="footer-note">This summary is printed electronically, so <u>no signature is required</u></div>
    <div class="sig-block">
      <div class="sig-line"></div>
      <div>${data.writtenByName ? e(data.writtenByName) : 'Doctor / Authorized Signatory'}</div>
    </div>
  </div>

  <script>
    window.onload = function () { setTimeout(function () { window.print() }, 300) }
  </script>
</body>
</html>`)

  win.document.close()
}
