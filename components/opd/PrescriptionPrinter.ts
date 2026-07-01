function e(str: unknown) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export interface PrescriptionPrintData {
  opdNumber: number
  caseNumber?: string
  visitDate: string
  patientName: string
  patientCode?: number
  patientAge: number
  patientAgeMonths?: number
  patientAgeDays?: number
  patientGender?: string
  patientAddress?: string
  patientBloodGroup?: string
  patientAllergies?: string
  doctorName?: string
  headerNote?: string
  footerNote?: string
  manualContent?: string
  medicines: { name: string; dose?: string; doseInterval?: string; doseDuration?: string; instruction?: string }[]
  findings: { category?: string; description?: string }[]
  clinicName: string
  clinicAddress?: string
  clinicPhone?: string
  clinicEmail?: string
  clinicWebsite?: string
  logoUrl?: string
}

export function printPrescription(data: PrescriptionPrintData) {
  const win = window.open('', '_blank', 'width=860,height=1100,menubar=no,toolbar=no,scrollbars=yes')
  if (!win) return

  const opdId   = `OPDN${String(data.opdNumber).padStart(4, '0')}`
  const checkId = data.caseNumber ? `CHKID${e(data.caseNumber)}` : `CHKID${String(data.opdNumber).padStart(4, '0')}`
  const ageStr  = [
    data.patientAge       ? `${data.patientAge} Year`        : '',
    data.patientAgeMonths ? `${data.patientAgeMonths} Month` : '',
    data.patientAgeDays   ? `${data.patientAgeDays} Day`     : '',
  ].filter(Boolean).join(', ') || '—'

  const contactRight = [
    data.clinicAddress ? `<div>Address: ${e(data.clinicAddress)}</div>` : '',
    data.clinicPhone   ? `<div>Phone No.: ${e(data.clinicPhone)}</div>` : '',
    data.clinicEmail   ? `<div>Email: ${e(data.clinicEmail)}</div>`     : '',
    data.clinicWebsite ? `<div>Website: ${e(data.clinicWebsite)}</div>` : '',
  ].filter(Boolean).join('')

  const medicineRows = data.medicines.map((m, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><strong>${e(m.name)}</strong></td>
      <td>${e(m.dose)}</td>
      <td>${e(m.doseInterval)}</td>
      <td>${e(m.doseDuration)}</td>
      <td>${e(m.instruction)}</td>
    </tr>
  `).join('')

  const findingRows = data.findings.map(f => `
    <tr>
      <td>${e(f.category)}</td>
      <td>${e(f.description)}</td>
    </tr>
  `).join('')

  win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Prescription – ${e(data.clinicName)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: Arial, sans-serif;
      font-size: 12px;
      color: #222;
      background: #fff;
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      padding: 14mm 18mm 18mm;
      display: flex;
      flex-direction: column;
    }
    .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 8px; }
    .logo-badge { display: inline-block; background: #e8003d; color: #fff; font-size: 10px; font-weight: bold; padding: 2px 7px; letter-spacing: 1px; margin-bottom: 4px; }
    .hospital-name { font-size: 22px; font-weight: bold; color: #111; }
    .contact-info { text-align: right; font-size: 11px; line-height: 1.8; color: #444; }
    .bill-bar { background: #1a1a1a; color: #fff; text-align: center; font-size: 13px; font-weight: bold; padding: 6px 0; margin: 10px 0 12px; letter-spacing: 1px; }
    .opd-meta { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 12px; }
    .opd-meta .left p { line-height: 1.8; }
    hr { border: 0; border-top: 1px solid #bbb; margin: 8px 0; }
    .info-grid { display: grid; grid-template-columns: 140px 1fr 80px 1fr 90px 1fr; gap: 4px 8px; margin-bottom: 12px; font-size: 12px; }
    .info-grid .lbl { color: #333; font-weight: normal; }
    .info-grid .val { color: #111; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    th { font-size: 11px; font-weight: bold; padding: 6px 6px; background: #f4f4f4; text-align: left; border-bottom: 2px solid #333; }
    td { padding: 6px 6px; font-size: 12px; border-bottom: 1px solid #eee; vertical-align: top; }
    .rx-area { flex: 1; border: 1px dashed #ccc; border-radius: 4px; padding: 8px; margin-bottom: 12px; }
    .header-note, .footer-note { font-size: 12px; line-height: 1.6; margin-bottom: 10px; }
    .footer { color: #0055bb; font-size: 11px; margin-top: 20px; }
    @media print { body { padding: 10mm 14mm; } @page { size: A4; margin: 0; } }
  </style>
</head>
<body>

  <div class="header">
    <div>
      ${data.logoUrl
        ? `<img src="${data.logoUrl}" alt="logo" style="height:60px;max-width:180px;object-fit:contain;display:block;margin-bottom:4px" />`
        : `<div class="logo-badge">&#9651; ${e(data.clinicName.split(' ')[0].toUpperCase())}</div>`
      }
      <div class="hospital-name">${e(data.clinicName)}</div>
    </div>
    <div class="contact-info">${contactRight}</div>
  </div>

  <div class="bill-bar">OPD Prescription</div>

  <div class="opd-meta">
    <div class="left">
      <p>OPD No&nbsp;<strong>${opdId}</strong></p>
      <p>OPD Checkup ID&nbsp;<strong>${checkId}</strong></p>
    </div>
    <div><strong>Date : ${e(data.visitDate)}</strong></div>
  </div>

  <hr />

  <div class="info-grid">
    <span class="lbl">Patient Name</span><span class="val">${e(data.patientName)}${data.patientCode ? ` (${data.patientCode})` : ''}</span>
    <span class="lbl">Age</span><span class="val">${ageStr}</span>
    <span class="lbl">Gender</span><span class="val">${e(data.patientGender)}</span>
    <span class="lbl">Consultant Doctor</span><span class="val">${e(data.doctorName)}</span>
    <span class="lbl">Address</span><span class="val">${e(data.patientAddress)}</span>
    <span class="lbl">Blood Group</span><span class="val">${e(data.patientBloodGroup)}</span>
    <span class="lbl">Known Allergies</span><span class="val">${e(data.patientAllergies)}</span>
    <span></span><span></span><span></span><span></span>
  </div>

  <hr />

  ${data.headerNote ? `<div class="header-note">${data.headerNote}</div>` : ''}

  ${data.findings.length > 0 ? `
    <table>
      <thead><tr><th>Finding Category</th><th>Description</th></tr></thead>
      <tbody>${findingRows}</tbody>
    </table>
  ` : ''}

  <div class="rx-area">
    ${data.manualContent ? `<div style="font-size:13px;line-height:1.8">${data.manualContent}</div>` : ''}
    ${!data.manualContent && medicineRows.length > 0 ? `
      <table style="margin-top:8px">
        <thead><tr><th>#</th><th>Medicine</th><th>Dose</th><th>Interval</th><th>Duration</th><th>Instruction</th></tr></thead>
        <tbody>${medicineRows}</tbody>
      </table>
    ` : ''}
  </div>

  ${data.footerNote ? `<div class="footer-note">${data.footerNote}</div>` : ''}

  <div class="footer">This invoice is printed electronically, so <u>no signature is required</u></div>

  <script>window.onload = function () { setTimeout(function () { window.print() }, 300) }</script>
</body>
</html>`)
  win.document.close()
}
