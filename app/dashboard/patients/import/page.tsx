"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  Download,
  Upload,
  FileText,
  X,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

// ── Column definitions ────────────────────────────────────────────────────────

const COLUMNS = [
  { key: "name", csv: "Patient", required: true },
  { key: "guardianName", csv: "Guardian", required: false },
  { key: "gender", csv: "Gender", required: false },
  { key: "age", csv: "Age (Year)", required: false },
  { key: "ageMonths", csv: "Age (Month)", required: false },
  { key: "ageDays", csv: "Age (Day)", required: false },
  { key: "maritalStatus", csv: "Marital Status", required: false },
  { key: "phone", csv: "Phone", required: false },
  { key: "email", csv: "Email", required: false },
  { key: "address", csv: "Address", required: false },
  { key: "remarks", csv: "Remarks", required: false },
  { key: "allergies", csv: "Known Allergies", required: false },
  { key: "nationalId", csv: "Identification Number", required: false },
  { key: "tpaId", csv: "TPA ID", required: false },
  { key: "tpaValidity", csv: "TPA Validity", required: false },
  { key: "bloodGroup", csv: "Blood Group", required: false },
];

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

const INSTRUCTIONS = [
  "Your CSV data should be in the format below. The first line of your CSV file should be the column headers as in the table example. Also make sure that your file is UTF-8 to avoid unnecessary encoding problems.",
  "For patient 'Gender' use Male, Female value.",
  "For Age columns 'Age (Year)' and 'Age (Month)' and 'Age (Day)' make sure that is numbers only.",
  "For patient 'Marital Status' use Single, Married, Widowed, Separated, Not Specified value.",
];

// ── CSV helpers ───────────────────────────────────────────────────────────────

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') {
      inQuotes = !inQuotes;
    } else if (line[i] === "," && !inQuotes) {
      result.push(cur.trim());
      cur = "";
    } else {
      cur += line[i];
    }
  }
  result.push(cur.trim());
  return result;
}

type ParsedRow = {
  [key: string]: string | boolean | undefined;
  _valid: boolean;
  _error?: string;
};

function parseCSV(text: string): ParsedRow[] {
  const lines = text
    .trim()
    .split(/\r?\n/)
    .filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]).map((h) =>
    h.replace(/^"|"$/g, "").trim(),
  );
  const csvKeyMap: Record<string, string> = {};
  for (const col of COLUMNS) csvKeyMap[col.csv.toLowerCase()] = col.key;

  return lines.slice(1).map((line, idx) => {
    const values = parseCSVLine(line);
    const row: ParsedRow = { _valid: true };
    headers.forEach((h, i) => {
      const key = csvKeyMap[h.toLowerCase()] ?? h;
      row[key] = (values[i] ?? "").replace(/^"|"$/g, "").trim();
    });
    if (!(row.name as string | undefined)?.trim()) {
      row._valid = false;
      row._error = `Row ${idx + 2}: Name is required`;
    }
    return row;
  });
}

function downloadSample() {
  const headers = COLUMNS.map((c) => c.csv).join(",");
  const sample =
    'Ramesh Kumar,Suresh Kumar,Male,35,6,10,Married,9876543210,ramesh@example.com,"123 Main St Jhansi",,Penicillin,ABCD1234,,2026-12-31,B+';
  const blob = new Blob([`${headers}\n${sample}`], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "sample_patients.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ImportPatientsPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [defaultBloodGroup, setDefaultBloodGroup] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{
    inserted: number;
    failed: number;
  } | null>(null);

  const validRows = rows.filter((r) => r._valid);
  const invalidRows = rows.filter((r) => !r._valid);

  function handleFile(f: File) {
    if (!f.name.endsWith(".csv")) {
      toast.error("Please select a .csv file");
      return;
    }
    setFile(f);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const parsed = parseCSV(e.target?.result as string);
      setRows(parsed);
    };
    reader.readAsText(f, "utf-8");
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, []);

  async function handleImport() {
    if (validRows.length === 0) {
      toast.error("No valid rows to import");
      return;
    }
    setImporting(true);
    try {
      const payload = validRows.map((r) => ({
        ...r,
        bloodGroup: r.bloodGroup || defaultBloodGroup || undefined,
        _valid: undefined,
        _error: undefined,
      }));
      const res = await fetch("/api/dashboard/patients/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patients: payload }),
      });
      const data = await res.json();
      if (data.success) {
        setResult(data.data);
        toast.success(`${data.data.inserted} patients imported successfully`);
      } else {
        toast.error(data.error);
      }
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link
          href="/dashboard/patients"
          className="flex items-center gap-1 hover:text-primary-600 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Patients
        </Link>
        <span>/</span>
        <span className="text-gray-800 font-medium">Import</span>
      </div>

      {/* ── Format Card ── */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {/* Card header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-gray-50">
          <h2 className="text-sm font-semibold text-gray-800">Patient</h2>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1.5"
            onClick={downloadSample}
          >
            <Download className="w-3.5 h-3.5" /> Download Sample Data
          </Button>
        </div>

        {/* Instructions */}
        <div className="px-5 py-4 space-y-1">
          {INSTRUCTIONS.map((text, i) => (
            <p key={i} className="text-sm text-gray-600">
              {i + 1}. {text}
            </p>
          ))}
        </div>

        {/* Column format table */}
        <div className="overflow-x-auto border-t border-gray-100">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    className="px-3 py-2 text-left font-semibold text-gray-700 whitespace-nowrap border-r border-gray-100 last:border-r-0 bg-gray-50"
                  >
                    {col.required && (
                      <span className="text-danger-500 mr-0.5">*</span>
                    )}
                    {col.csv}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {COLUMNS.map((col) => (
                  <td
                    key={col.key}
                    className="px-3 py-2 text-gray-400 border-r border-gray-100 last:border-r-0 whitespace-nowrap"
                  >
                    Sample Data
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Upload row */}
        <div className="px-5 py-4 border-t border-gray-200 flex flex-wrap items-end gap-4">
          {/* Default blood group */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block">
              Blood Group (default)
            </label>
            <Select
              value={defaultBloodGroup}
              onValueChange={(v) => setDefaultBloodGroup(v ?? "")}
            >
              <SelectTrigger className="h-9 w-40 text-sm">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {BLOOD_GROUPS.map((bg) => (
                  <SelectItem key={bg} value={bg}>
                    {bg}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* File drop zone */}
          <div className="flex-1 min-w-64 space-y-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block">
              Select CSV File <span className="text-danger-500">*</span>
            </label>
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={`flex items-center justify-center gap-2 h-9 border-2 border-dashed rounded-md cursor-pointer transition-colors text-sm
                ${dragging ? "border-primary-400 bg-primary-50" : "border-gray-300 hover:border-gray-400 bg-gray-50"}`}
            >
              {file ? (
                <div className="flex items-center gap-2 text-gray-700">
                  <FileText className="w-4 h-4 text-primary-600" />
                  <span className="font-medium">{file.name}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                      setRows([]);
                      setResult(null);
                    }}
                    className="text-gray-400 hover:text-danger-500"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <span className="text-gray-400 flex items-center gap-1.5">
                  <Upload className="w-4 h-4" /> Drop a file here or click to
                  browse
                </span>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) =>
                e.target.files?.[0] && handleFile(e.target.files[0])
              }
            />
          </div>

          <Button
            className="bg-primary-600 hover:bg-primary-700 h-9 text-sm gap-1.5"
            onClick={handleImport}
            disabled={importing || validRows.length === 0}
          >
            <Upload className="w-4 h-4" />
            {importing ? "Importing..." : "Import"}
          </Button>
        </div>
      </div>

      {/* ── Parse summary ── */}
      {rows.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-success-600">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-medium">
                {validRows.length} valid rows
              </span>
            </div>
            {invalidRows.length > 0 && (
              <div className="flex items-center gap-2 text-danger-500">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {invalidRows.length} invalid rows
                </span>
              </div>
            )}
          </div>

          {/* Errors */}
          {invalidRows.length > 0 && (
            <div className="bg-danger-50 border border-danger-200 rounded-md p-3 space-y-1">
              {invalidRows.map((r, i) => (
                <p key={i} className="text-xs text-danger-600">
                  {r._error}
                </p>
              ))}
            </div>
          )}

          {/* Preview table */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Preview (first 5 valid rows)
            </p>
            <div className="overflow-x-auto rounded-md border border-gray-200">
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    {COLUMNS.slice(0, 8).map((col) => (
                      <th
                        key={col.key}
                        className="px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap border-b border-gray-200"
                      >
                        {col.csv}
                      </th>
                    ))}
                    <th className="px-3 py-2 text-left font-semibold text-gray-600 border-b border-gray-200">
                      …
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {validRows.slice(0, 5).map((row, i) => (
                    <tr
                      key={i}
                      className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}
                    >
                      {COLUMNS.slice(0, 8).map((col) => (
                        <td
                          key={col.key}
                          className="px-3 py-1.5 text-gray-700 border-b border-gray-100 whitespace-nowrap max-w-32 truncate"
                        >
                          {row[col.key] || (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                      ))}
                      <td className="px-3 py-1.5 text-gray-400 border-b border-gray-100">
                        …
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Import result ── */}
      {result && (
        <div className="bg-success-50 border border-success-200 rounded-lg p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-success-600" />
            <div>
              <p className="font-semibold text-success-800">
                {result.inserted} patients imported successfully
              </p>
              {result.failed > 0 && (
                <p className="text-sm text-danger-600 mt-0.5">
                  {result.failed} rows skipped due to errors
                </p>
              )}
            </div>
          </div>
          <Button
            size="sm"
            className="bg-primary-600 hover:bg-primary-700 text-xs"
            onClick={() => router.push("/dashboard/patients")}
          >
            View Patients
          </Button>
        </div>
      )}
    </div>
  );
}
