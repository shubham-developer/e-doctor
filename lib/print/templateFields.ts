import type { PrintDocumentKey } from "./customTemplate";

/** Presentation-format hint shown in the builder's palette/inspector — actual formatting happens once, where each *Printer.ts already computes it, not here (see renderCustomTemplate.ts). */
export type TemplateFieldFormat = "money" | "date" | "text";

export interface TemplateFieldDef {
  token: string;
  label: string;
  format?: TemplateFieldFormat;
}

export interface TemplateTableColumnDef {
  key: string;
  label: string;
  format?: TemplateFieldFormat;
}

export interface TemplateTableDef {
  token: string;
  label: string;
  /** "flat": user configures visible columns/order. "nested": a fixed-markup repeating block (e.g. test → parameters), position/resize only. */
  kind: "flat" | "nested";
  columns: TemplateTableColumnDef[];
  /** "nested" tables only — which fixed block layout renderCustomTemplate.ts should use, since "tests" means different things per document. */
  nestedKind?: "parameters" | "narrative";
}

export interface TemplateFieldRegistryEntry {
  fields: TemplateFieldDef[];
  tables?: TemplateTableDef[];
}

/** Every document exposes these — Custom mode skips the automatic header, so a tenant matching pre-printed letterhead needs to place (or deliberately omit) them itself. */
const CLINIC_FIELDS: TemplateFieldDef[] = [
  { token: "clinicName", label: "Clinic Name" },
  { token: "clinicAddress", label: "Clinic Address" },
  { token: "clinicPhone", label: "Clinic Phone" },
  { token: "clinicEmail", label: "Clinic Email" },
  { token: "clinicWebsite", label: "Clinic Website" },
];

/** Bound via an "image" element, not a text substitution. */
export const CLINIC_LOGO_TOKEN = "logoUrl";

const AGE_GENDER_FIELDS: TemplateFieldDef[] = [
  { token: "ageStr", label: "Age" },
  { token: "patientGender", label: "Gender" },
];

export const PRINT_TEMPLATE_FIELDS: Record<
  PrintDocumentKey,
  TemplateFieldRegistryEntry
> = {
  opdReceipt: {
    fields: [
      ...CLINIC_FIELDS,
      { token: "opdId", label: "OPD ID" },
      { token: "patientLabel", label: "Patient Name" },
      { token: "apptDate", label: "Appointment Date" },
      ...AGE_GENDER_FIELDS,
      { token: "doctorLabel", label: "Consultant Doctor" },
      { token: "applied", label: "Amount", format: "money" },
      { token: "disc", label: "Discount", format: "money" },
      { token: "taxAmt", label: "Tax", format: "money" },
      { token: "netAmt", label: "Net Amount", format: "money" },
    ],
    tables: [
      {
        token: "charges",
        label: "Charges",
        kind: "flat",
        columns: [
          { key: "name", label: "Description" },
          { key: "fee", label: "Fee", format: "money" },
        ],
      },
    ],
  },

  prescription: {
    fields: [
      ...CLINIC_FIELDS,
      { token: "opdId", label: "OPD No" },
      { token: "visitDate", label: "Date" },
      { token: "patientName", label: "Patient Name" },
      { token: "uhid", label: "UHID" },
      ...AGE_GENDER_FIELDS,
      { token: "patientAddress", label: "Patient Address" },
      { token: "patientBloodGroup", label: "Blood Group" },
      { token: "patientAllergies", label: "Allergies" },
      { token: "doctorName", label: "Consultant Doctor" },
      { token: "headerNote", label: "Header Note" },
      { token: "footerNote", label: "Footer Note" },
      { token: "manualContent", label: "Manual Content" },
    ],
    tables: [
      {
        token: "medicines",
        label: "Medicines",
        kind: "flat",
        columns: [
          { key: "name", label: "Medicine" },
          { key: "dose", label: "Dose" },
          { key: "doseInterval", label: "Interval" },
          { key: "doseDuration", label: "Duration" },
          { key: "instruction", label: "Instruction" },
        ],
      },
      {
        token: "findings",
        label: "Findings",
        kind: "flat",
        columns: [
          { key: "category", label: "Finding Category" },
          { key: "description", label: "Description" },
        ],
      },
    ],
  },

  // Same underlying data shape as "prescription" (PrescriptionPrintData) — see PrescriptionPrinter.ts's layoutModule branch.
  manualPrescription: {
    fields: [
      ...CLINIC_FIELDS,
      { token: "opdId", label: "OPD No" },
      { token: "visitDate", label: "Date" },
      { token: "patientName", label: "Patient Name" },
      { token: "uhid", label: "UHID" },
      ...AGE_GENDER_FIELDS,
      { token: "patientAddress", label: "Patient Address" },
      { token: "patientBloodGroup", label: "Blood Group" },
      { token: "patientAllergies", label: "Allergies" },
      { token: "doctorName", label: "Consultant Doctor" },
      { token: "headerNote", label: "Header Note" },
      { token: "footerNote", label: "Footer Note" },
      { token: "manualContent", label: "Manual Content" },
    ],
    tables: [
      {
        token: "findings",
        label: "Findings",
        kind: "flat",
        columns: [
          { key: "category", label: "Finding Category" },
          { key: "description", label: "Description" },
        ],
      },
    ],
  },

  pharmacyBill: {
    fields: [
      ...CLINIC_FIELDS,
      { token: "billId", label: "Bill No" },
      { token: "patientLabel", label: "Patient" },
      { token: "doctorName", label: "Consultant Doctor" },
      { token: "caseId", label: "Case ID" },
      { token: "prescriptionNo", label: "Prescription No" },
      { token: "billDate", label: "Bill Date" },
      { token: "paymentMode", label: "Payment Mode" },
      { token: "totalAmount", label: "Total", format: "money" },
      { token: "discountAmount", label: "Discount", format: "money" },
      { token: "taxAmount", label: "Tax", format: "money" },
      { token: "netAmount", label: "Net Amount", format: "money" },
      { token: "paidAmount", label: "Paid", format: "money" },
      { token: "balance", label: "Balance", format: "money" },
    ],
    tables: [
      {
        token: "lines",
        label: "Medicine Lines",
        kind: "flat",
        columns: [
          { key: "medicineName", label: "Medicine" },
          { key: "batchNo", label: "Batch No" },
          { key: "expiryDate", label: "Expiry Date" },
          { key: "quantity", label: "Qty" },
          { key: "salePrice", label: "Rate", format: "money" },
          { key: "taxPercent", label: "Tax %" },
          { key: "discountPercent", label: "Discount %" },
          { key: "amount", label: "Amount", format: "money" },
        ],
      },
    ],
  },

  ipdBill: {
    fields: [
      ...CLINIC_FIELDS,
      { token: "ipdId", label: "IPD No" },
      { token: "patientLabel", label: "Patient Name" },
      ...AGE_GENDER_FIELDS,
      { token: "patientBloodGroup", label: "Blood Group" },
      { token: "patientPhone", label: "Phone" },
      { token: "doctorName", label: "Consultant" },
      { token: "doctorSpecialization", label: "Department" },
      { token: "admissionDate", label: "Admission Date" },
      { token: "dischargeDate", label: "Discharge Date" },
      { token: "bedLabel", label: "Bed" },
      { token: "caseNumber", label: "Case No" },
      { token: "totalCharges", label: "Total Charges", format: "money" },
      { token: "totalPaid", label: "Total Paid", format: "money" },
      { token: "balance", label: "Balance", format: "money" },
      { token: "paymentAmount", label: "Payment Amount", format: "money" },
      { token: "paymentMode", label: "Payment Mode" },
      { token: "paymentNote", label: "Payment Note" },
      { token: "paymentDate", label: "Payment Date" },
      { token: "paymentAddedByName", label: "Payment Received By" },
    ],
    tables: [
      {
        token: "charges",
        label: "Charges",
        kind: "flat",
        columns: [
          { key: "categoryName", label: "Description" },
          { key: "quantity", label: "Qty" },
          { key: "unitPrice", label: "Unit Price", format: "money" },
          { key: "total", label: "Amount", format: "money" },
          { key: "date", label: "Date" },
          { key: "note", label: "Note" },
        ],
      },
    ],
  },

  ipdDischargeSummary: {
    fields: [
      ...CLINIC_FIELDS,
      { token: "ipdId", label: "IPD Number" },
      { token: "patientLabel", label: "Patient Name" },
      ...AGE_GENDER_FIELDS,
      { token: "patientBloodGroup", label: "Blood Group" },
      { token: "bedDisplay", label: "Bed" },
      { token: "caseNumber", label: "Case No" },
      { token: "admissionDate", label: "Admission Date" },
      { token: "dischargeDate", label: "Discharge Date" },
      { token: "doctorName", label: "Consultant" },
      { token: "doctorSpecialization", label: "Specialization" },
      { token: "diagnosis", label: "Diagnosis" },
      { token: "historyOfPresentIllness", label: "History of Present Illness" },
      { token: "examinationFindings", label: "Examination Findings" },
      { token: "investigations", label: "Investigations" },
      { token: "treatmentGiven", label: "Treatment Given" },
      { token: "proceduresPerformed", label: "Procedures Performed" },
      { token: "conditionAtDischarge", label: "Condition at Discharge" },
      { token: "medicationsAtDischarge", label: "Medications at Discharge" },
      { token: "followUpInstructions", label: "Follow-up Instructions" },
      { token: "additionalNotes", label: "Additional Notes" },
      { token: "writtenByName", label: "Written By" },
    ],
  },

  pathologyBill: {
    fields: [
      ...CLINIC_FIELDS,
      { token: "billNo", label: "Bill No" },
      { token: "patientLabel", label: "Patient" },
      { token: "referenceDoctor", label: "Ref. Doctor" },
      { token: "caseId", label: "Case ID" },
      { token: "paymentMode", label: "Payment Mode" },
      { token: "billDate", label: "Bill Date" },
      { token: "totalAmount", label: "Total", format: "money" },
      { token: "discountAmount", label: "Discount", format: "money" },
      { token: "taxAmount", label: "Tax", format: "money" },
      { token: "netAmount", label: "Net Amount", format: "money" },
      { token: "paidAmount", label: "Paid", format: "money" },
      { token: "balance", label: "Balance", format: "money" },
      { token: "note", label: "Note" },
      { token: "previousReportValue", label: "Previous Report Value" },
    ],
    tables: [
      {
        token: "items",
        label: "Test Items",
        kind: "flat",
        columns: [
          { key: "testName", label: "Test Name" },
          { key: "reportDate", label: "Report Date" },
          { key: "charge", label: "Charge", format: "money" },
          { key: "tax", label: "Tax %" },
          { key: "amount", label: "Amount", format: "money" },
        ],
      },
    ],
  },

  pathologyResults: {
    fields: [
      ...CLINIC_FIELDS,
      { token: "billNo", label: "Bill No" },
      { token: "billDate", label: "Bill Date" },
      { token: "reportDate", label: "Report Date" },
      { token: "patientName", label: "Patient" },
      { token: "uhid", label: "UHID" },
      { token: "patientAge", label: "Age" },
      { token: "patientGender", label: "Gender" },
      { token: "referenceDoctor", label: "Ref. Doctor" },
      { token: "reportedByName", label: "Reported By" },
      { token: "verifiedByName", label: "Verified By" },
    ],
    tables: [
      {
        token: "tests",
        label: "Test Results (parameter table per test)",
        kind: "nested",
        nestedKind: "parameters",
        columns: [],
      },
    ],
  },

  radiologyBill: {
    fields: [
      ...CLINIC_FIELDS,
      { token: "billNo", label: "Bill No" },
      { token: "patientLabel", label: "Patient" },
      { token: "referenceDoctor", label: "Ref. Doctor" },
      { token: "caseId", label: "Case ID" },
      { token: "paymentMode", label: "Payment Mode" },
      { token: "billDate", label: "Bill Date" },
      { token: "totalAmount", label: "Total", format: "money" },
      { token: "discountAmount", label: "Discount", format: "money" },
      { token: "taxAmount", label: "Tax", format: "money" },
      { token: "netAmount", label: "Net Amount", format: "money" },
      { token: "paidAmount", label: "Paid", format: "money" },
      { token: "balance", label: "Balance", format: "money" },
      { token: "note", label: "Note" },
      { token: "previousReportValue", label: "Previous Report Value" },
    ],
    tables: [
      {
        token: "items",
        label: "Test Items",
        kind: "flat",
        columns: [
          { key: "testName", label: "Test Name" },
          { key: "reportDate", label: "Report Date" },
          { key: "charge", label: "Charge", format: "money" },
          { key: "tax", label: "Tax %" },
          { key: "amount", label: "Amount", format: "money" },
        ],
      },
    ],
  },

  radiologyResults: {
    fields: [
      ...CLINIC_FIELDS,
      { token: "billNo", label: "Bill No" },
      { token: "billDate", label: "Bill Date" },
      { token: "reportDate", label: "Report Date" },
      { token: "patientName", label: "Patient" },
      { token: "uhid", label: "UHID" },
      { token: "patientAge", label: "Age" },
      { token: "patientGender", label: "Gender" },
      { token: "referenceDoctor", label: "Ref. Doctor" },
      { token: "reportedByName", label: "Reported By" },
      { token: "verifiedByName", label: "Verified By" },
    ],
    tables: [
      {
        token: "tests",
        label: "Test Results (findings/impression per test)",
        kind: "nested",
        nestedKind: "narrative",
        columns: [],
      },
    ],
  },
};
