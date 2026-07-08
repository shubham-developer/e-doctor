export interface TokenSlipData {
  tokenNumber: number;
  patientName: string;
  uhid?: string;
  doctorName?: string;
  chiefComplaint?: string;
  visitDate: string;
  clinicName: string;
  clinicPhone?: string;
  generatedAt?: string;
}

export function printTokenSlip(data: TokenSlipData) {
  const {
    tokenNumber,
    patientName,
    uhid,
    doctorName,
    chiefComplaint,
    visitDate,
    clinicName,
    clinicPhone,
    generatedAt = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
  } = data;

  const token = String(tokenNumber).padStart(3, "0");

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>OPD Token ${token}</title>
  <style>
    @page { size: 80mm 120mm; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Courier New', monospace;
      font-size: 11px;
      padding: 8px;
      width: 80mm;
      color: #000;
    }
    .clinic { text-align: center; margin-bottom: 6px; }
    .clinic-name { font-size: 13px; font-weight: bold; }
    .clinic-phone { font-size: 10px; color: #444; }
    .divider { border-top: 1px dashed #000; margin: 6px 0; }
    .token-box {
      text-align: center;
      border: 2px solid #000;
      border-radius: 4px;
      padding: 8px 4px;
      margin: 6px 0;
    }
    .token-label { font-size: 10px; text-transform: uppercase; letter-spacing: 2px; }
    .token-number { font-size: 48px; font-weight: bold; line-height: 1; margin: 4px 0; }
    .row { display: flex; justify-content: space-between; margin: 2px 0; }
    .label { color: #555; }
    .value { font-weight: bold; text-align: right; max-width: 55%; }
    .footer { text-align: center; font-size: 9px; color: #555; margin-top: 6px; }
  </style>
</head>
<body>
  <div class="clinic">
    <div class="clinic-name">${clinicName}</div>
    ${clinicPhone ? `<div class="clinic-phone">${clinicPhone}</div>` : ""}
  </div>
  <div class="divider"></div>

  <div class="token-box">
    <div class="token-label">OPD Token</div>
    <div class="token-number">${token}</div>
    <div class="token-label">${visitDate}</div>
  </div>

  <div class="divider"></div>

  <div class="row">
    <span class="label">Patient</span>
    <span class="value">${patientName}</span>
  </div>
  ${uhid ? `<div class="row"><span class="label">ID</span><span class="value">#${uhid}</span></div>` : ""}
  ${doctorName ? `<div class="row"><span class="label">Doctor</span><span class="value">${doctorName}</span></div>` : ""}
  ${chiefComplaint ? `<div class="row"><span class="label">Complaint</span><span class="value">${chiefComplaint}</span></div>` : ""}

  <div class="divider"></div>
  <div class="footer">
    Generated at ${generatedAt} &bull; Please wait for your token to be called
  </div>
</body>
</html>`;

  const w = window.open("", "_blank", "width=340,height=520,toolbar=0,menubar=0");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.onload = () => { w.print(); w.close(); };
}
