"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  X,
  User,
  Phone,
  FlaskConical,
  Stethoscope,
  Pill,
  BedDouble,
  Activity,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { useApp } from "@/lib/context";
import { GenerateBillDialog as PathologyBillDialog } from "@/components/pathology/GenerateBillDialog";
import { GenerateBillDialog as RadiologyBillDialog } from "@/components/radiology/GenerateBillDialog";
import { OpdAddForm } from "@/components/opd/OpdAddForm";

// ── Patient type from search API ──────────────────────────────────────────────

interface SearchPatient {
  _id: string;
  name: string;
  patientCode?: number;
  age?: number;
  gender?: string;
  phone?: string;
}

// PatientOption shape expected by pathology/radiology dialogs { id, name, code }
function toDialogPatient(p: SearchPatient) {
  return {
    id: p._id,
    name: p.name,
    code: p.patientCode != null ? String(p.patientCode) : undefined,
  };
}

// PatientOption shape expected by OpdAddForm { _id, name, age, ... }
function toOpdPatient(p: SearchPatient) {
  return {
    _id: p._id,
    name: p.name,
    patientCode: p.patientCode,
    age: p.age ?? 0,
    gender: p.gender,
    phone: p.phone,
  };
}

// ── Action types ──────────────────────────────────────────────────────────────

type QuickAction = "opd" | "pathology" | "radiology" | null;

// ── Main component ────────────────────────────────────────────────────────────

export function GlobalPatientSearch() {
  const router = useRouter();
  const { tenant, can } = useApp();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchPatient[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<SearchPatient | null>(null);
  const [action, setAction] = useState<QuickAction>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Search patients
  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const res = await apiClient.get<{ patients: SearchPatient[] }>(
      `/api/dashboard/patients?search=${encodeURIComponent(q)}&limit=8`,
    );
    setSearching(false);
    if (res.success) setResults(res.data?.patients ?? []);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, search]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        close();
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Keyboard: Escape closes, Ctrl+K / Cmd+K opens
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        openSearch();
      }
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  function openSearch() {
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function close() {
    setOpen(false);
    setQuery("");
    setResults([]);
    setSelected(null);
    setAction(null);
  }

  // Open a service form: hides the search panel so they don't stack
  function openAction(a: QuickAction) {
    setOpen(false);
    setAction(a);
  }

  function closeAction() {
    setAction(null);
    // Re-open the search panel so user can pick another service or re-search
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function selectPatient(p: SearchPatient) {
    setSelected(p);
    setResults([]);
    setQuery(p.name);
  }

  function navigate(path: string) {
    close();
    router.push(path);
  }

  const ageGender = selected
    ? [selected.age != null && `${selected.age}y`, selected.gender]
        .filter(Boolean)
        .join(" / ")
    : "";

  return (
    <>
      {/* Search trigger button */}
      <button
        onClick={openSearch}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors text-xs font-medium min-w-[160px] sm:min-w-[220px]"
      >
        <Search className="w-3.5 h-3.5 shrink-0" />
        <span className="flex-1 text-left text-gray-400">Search patient…</span>
        <kbd className="hidden sm:inline text-2xs bg-white border border-gray-200 rounded px-1 py-0.5 font-mono text-gray-400">
          ⌘K
        </kbd>
      </button>

      {/* Overlay backdrop */}
      {open && <div className="fixed inset-0 bg-black/30 z-[60]" />}

      {/* Search panel */}
      {open && (
        <div
          ref={containerRef}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[70] w-full max-w-lg px-4"
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
            {/* Input row */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
              <Search className="w-4 h-4 text-gray-400 shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelected(null);
                  setAction(null);
                }}
                placeholder="Search by name, phone, or patient code…"
                className="flex-1 text-sm outline-none text-gray-800 placeholder:text-gray-400 bg-transparent"
              />
              {searching && (
                <Loader2 className="w-4 h-4 text-gray-400 animate-spin shrink-0" />
              )}
              <button
                onClick={close}
                className="p-1 rounded hover:bg-gray-100 text-gray-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Results dropdown */}
            {results.length > 0 && !selected && (
              <ul className="max-h-64 overflow-y-auto divide-y divide-gray-50">
                {results.map((p) => (
                  <li key={p._id}>
                    <button
                      onClick={() => selectPatient(p)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-primary-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">
                          {p.name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {[
                            p.patientCode && `#${p.patientCode}`,
                            p.age != null && `${p.age}y`,
                            p.gender,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                      {p.phone && (
                        <span className="text-xs text-gray-400 shrink-0">
                          {p.phone}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {/* No results */}
            {query.length >= 2 &&
              !searching &&
              results.length === 0 &&
              !selected && (
                <div className="px-4 py-6 text-center text-sm text-gray-400">
                  No patients found for &ldquo;{query}&rdquo;
                </div>
              )}

            {/* Hint when nothing typed yet */}
            {query.length < 2 && !selected && (
              <div className="px-4 py-5 text-center text-xs text-gray-400">
                Type at least 2 characters to search
              </div>
            )}

            {/* Patient selected — Quick Actions panel */}
            {selected && (
              <div className="p-4 space-y-3">
                {/* Patient info card */}
                <div className="flex items-center gap-3 bg-primary-50 border border-primary-100 rounded-xl p-3">
                  <div className="w-9 h-9 rounded-full bg-primary-600 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">
                      {selected.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {[
                        selected.patientCode && `#${selected.patientCode}`,
                        ageGender,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  {selected.phone && (
                    <div className="flex items-center gap-1 text-xs text-gray-500 shrink-0">
                      <Phone className="w-3 h-3" />
                      {selected.phone}
                    </div>
                  )}
                  <button
                    onClick={() => {
                      setSelected(null);
                      setQuery("");
                    }}
                    className="p-1 rounded hover:bg-primary-100 text-gray-400 shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Quick action label */}
                <p className="text-2xs font-semibold text-gray-400 uppercase tracking-wider px-1">
                  Quick Services
                </p>

                {/* Action grid */}
                <div className="grid grid-cols-3 gap-2">
                  <ActionButton
                    icon={ExternalLink}
                    label="View Profile"
                    color="text-gray-600"
                    bg="bg-gray-100 hover:bg-gray-200"
                    onClick={() =>
                      navigate(`/dashboard/patients/${selected._id}`)
                    }
                  />
                  {can("opd", "add") && (
                    <ActionButton
                      icon={Activity}
                      label="OPD Visit"
                      color="text-primary-600"
                      bg="bg-primary-50 hover:bg-primary-100"
                      onClick={() => openAction("opd")}
                    />
                  )}
                  {can("pathology", "add") && (
                    <ActionButton
                      icon={FlaskConical}
                      label="Pathology Bill"
                      color="text-teal-600"
                      bg="bg-teal-50 hover:bg-teal-100"
                      onClick={() => openAction("pathology")}
                    />
                  )}
                  {can("radiology", "add") && (
                    <ActionButton
                      icon={Stethoscope}
                      label="Radiology Bill"
                      color="text-purple-600"
                      bg="bg-purple-50 hover:bg-purple-100"
                      onClick={() => openAction("radiology")}
                    />
                  )}
                  {can("pharmacy", "add") && (
                    <ActionButton
                      icon={Pill}
                      label="Pharmacy Bill"
                      color="text-warning-600"
                      bg="bg-warning-50 hover:bg-warning-100"
                      onClick={() => navigate(`/dashboard/pharmacy`)}
                    />
                  )}
                  {can("ipd", "add") && (
                    <ActionButton
                      icon={BedDouble}
                      label="IPD Admit"
                      color="text-indigo-600"
                      bg="bg-indigo-50 hover:bg-indigo-100"
                      onClick={() => navigate(`/dashboard/ipd`)}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* OPD visit form — full-screen shell, search panel hidden while open */}
      {action === "opd" && selected && (
        <OpdAddForm
          initialPatient={toOpdPatient(selected)}
          onClose={closeAction}
          onSaved={() => {
            setAction(null);
            close();
          }}
        />
      )}

      {/* Pathology bill dialog — search panel hidden while open */}
      {action === "pathology" && selected && (
        <PathologyBillDialog
          clinicName={tenant?.name ?? "Clinic"}
          clinicAddress={tenant?.address}
          clinicPhone={tenant?.whatsappNumber}
          logoUrl={tenant?.logoUrl}
          initialPatient={toDialogPatient(selected)}
          onClose={closeAction}
          onSaved={() => {
            setAction(null);
            close();
          }}
        />
      )}

      {/* Radiology bill dialog — search panel hidden while open */}
      {action === "radiology" && selected && (
        <RadiologyBillDialog
          clinicName={tenant?.name ?? "Clinic"}
          clinicAddress={tenant?.address}
          clinicPhone={tenant?.whatsappNumber}
          logoUrl={tenant?.logoUrl}
          initialPatient={toDialogPatient(selected)}
          onClose={closeAction}
          onSaved={() => {
            setAction(null);
            close();
          }}
        />
      )}
    </>
  );
}

// ── Small action button ───────────────────────────────────────────────────────

function ActionButton({
  icon: Icon,
  label,
  color,
  bg,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  color: string;
  bg: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 rounded-xl p-3 transition-colors ${bg}`}
    >
      <Icon className={`w-5 h-5 ${color}`} />
      <span
        className={`text-2xs font-semibold text-center leading-tight ${color}`}
      >
        {label}
      </span>
    </button>
  );
}
