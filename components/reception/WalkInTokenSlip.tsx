export interface TokenSlipData {
  tokenNumber: number
  patientName: string
  doctorName: string
  slotTime?: string
  clinicName: string
  clinicCity?: string
  date: string
}

export interface PatientSlipData {
  tokenNumber: number
  patientName: string
  patientAge: number
  patientPhone?: string
  doctorName: string
  doctorSpecialization?: string
  slotTime?: string
  symptoms: string
  clinicName: string
  clinicCity?: string
  date: string
}

export function printWalkInToken(data: TokenSlipData) {
  const win = window.open('', '_blank', 'width=360,height=620,menubar=no,toolbar=no,scrollbars=no')
  if (!win) return

  win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Walk-in Token</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 13px;
      width: 280px;
      margin: 0 auto;
      padding: 20px 16px;
      text-align: center;
      background: #fff;
      color: #000;
    }
    .clinic-name { font-size: 15px; font-weight: bold; letter-spacing: 0.5px; }
    .clinic-city { font-size: 11px; margin-top: 2px; color: #333; }
    .divider { border: none; border-top: 1px dashed #000; margin: 10px 0; }
    .walkin-badge {
      font-size: 15px;
      font-weight: bold;
      letter-spacing: 3px;
      margin: 8px 0;
    }
    .token-label { font-size: 10px; letter-spacing: 1px; margin-top: 10px; }
    .token-box {
      display: inline-block;
      border: 3px double #000;
      padding: 8px 24px;
      margin: 8px 0;
      font-size: 42px;
      font-weight: bold;
      min-width: 80px;
    }
    .info { text-align: left; font-size: 12px; margin: 4px 0; }
    .footer { margin-top: 14px; font-size: 12px; line-height: 1.6; }
    @media print {
      body { width: 58mm; padding: 10px 8px; }
    }
  </style>
</head>
<body>
  <div class="clinic-name">${escapeHtml(data.clinicName)}</div>
  ${data.clinicCity ? `<div class="clinic-city">${escapeHtml(data.clinicCity)}</div>` : ''}
  <hr class="divider" />
  <div class="walkin-badge">** WALK-IN **</div>
  <div class="token-label">TOKEN NUMBER</div>
  <div class="token-box">${data.tokenNumber}</div>
  <hr class="divider" />
  <div class="info">Patient: ${escapeHtml(data.patientName)}</div>
  <div class="info">Doctor: ${escapeHtml(data.doctorName)}</div>
  <div class="info">Date: ${escapeHtml(data.date)}</div>
  <div class="info">Time: ${data.slotTime ? escapeHtml(data.slotTime) : 'Next available'}</div>
  <hr class="divider" />
  <div class="footer">Please wait<br />Dhanyavaad &#x1F64F;</div>
  <script>
    window.onload = function () {
      setTimeout(function () { window.print(); }, 300)
    }
  </script>
</body>
</html>`)
  win.document.close()
}

export function printPatientSlip(data: PatientSlipData) {
  const win = window.open('', '_blank', 'width=620,height=900,menubar=no,toolbar=no,scrollbars=yes')
  if (!win) return

  win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Patient Info Slip</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: Arial, sans-serif;
      font-size: 13px;
      width: 148mm;
      min-height: 200mm;
      margin: 0 auto;
      padding: 14mm 12mm;
      background: #fff;
      color: #000;
      display: flex;
      flex-direction: column;
    }
    .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 10px; }
    .clinic-name { font-size: 18px; font-weight: bold; letter-spacing: 0.5px; }
    .clinic-city { font-size: 12px; color: #444; margin-top: 2px; }
    .meta-row { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 10px; }
    .token-badge {
      display: inline-block;
      border: 2px solid #000;
      padding: 2px 10px;
      font-weight: bold;
      font-size: 14px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px 14px;
      border: 1px solid #000;
      padding: 8px 10px;
      margin-bottom: 10px;
      font-size: 13px;
    }
    .info-row { display: flex; gap: 4px; }
    .info-label { font-weight: bold; white-space: nowrap; }
    .info-value { color: #111; }
    .doctor-box {
      border: 1px solid #000;
      padding: 6px 10px;
      margin-bottom: 10px;
      font-size: 13px;
    }
    .section-title {
      font-size: 11px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #555;
      margin-bottom: 4px;
      margin-top: 10px;
    }
    .symptoms-box {
      border: 1px solid #bbb;
      padding: 6px 8px;
      background: #fafafa;
      font-size: 13px;
      min-height: 36px;
      margin-bottom: 4px;
      white-space: pre-wrap;
    }
    .blank-area {
      flex: 1;
      min-height: 200px;
    }
    .sig-row {
      display: flex;
      justify-content: flex-end;
      margin-top: 20px;
      font-size: 12px;
      gap: 4px;
    }
    .sig-line { border-top: 1px solid #000; width: 140px; text-align: center; padding-top: 4px; }
    @media print {
      body { width: 148mm; padding: 10mm 10mm; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="clinic-name">${escapeHtml(data.clinicName)}</div>
    ${data.clinicCity ? `<div class="clinic-city">${escapeHtml(data.clinicCity)}</div>` : ''}
  </div>

  <div class="meta-row">
    <span>Date: <strong>${escapeHtml(data.date)}</strong></span>
    <span>Time: <strong>${data.slotTime ? escapeHtml(data.slotTime) : 'Walk-in'}</strong></span>
    <span>Token: <span class="token-badge">#${data.tokenNumber}</span></span>
  </div>

  <div class="info-grid">
    <div class="info-row">
      <span class="info-label">Name:</span>
      <span class="info-value">${escapeHtml(data.patientName)}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Age:</span>
      <span class="info-value">${data.patientAge} yrs</span>
    </div>
    ${data.patientPhone ? `<div class="info-row">
      <span class="info-label">Phone:</span>
      <span class="info-value">+91 ${escapeHtml(data.patientPhone)}</span>
    </div>` : '<div></div>'}
    <div class="info-row">
      <span class="info-label">Type:</span>
      <span class="info-value">Walk-in</span>
    </div>
  </div>

  <div class="doctor-box">
    <strong>Dr. ${escapeHtml(data.doctorName)}</strong>${data.doctorSpecialization ? ` &nbsp;·&nbsp; ${escapeHtml(data.doctorSpecialization)}` : ''}
  </div>

  <div class="section-title">Chief Complaint / Symptoms</div>
  <div class="symptoms-box">${escapeHtml(data.symptoms)}</div>

  <div class="blank-area"></div>

  <div class="sig-row">
    <div class="sig-line">Doctor's Signature</div>
  </div>

  <script>
    window.onload = function () {
      setTimeout(function () { window.print(); }, 300)
    }
  </script>
</body>
</html>`)
  win.document.close()
}

function escapeHtml(str: string) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
