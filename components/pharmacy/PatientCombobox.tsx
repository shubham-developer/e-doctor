"use client";

import { useState, useEffect, useRef } from "react";
import { Search, ChevronDown } from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import type { PatientOption } from "./types";

export function PatientCombobox({
  value,
  onChange,
}: {
  value: PatientOption | null;
  onChange: (p: PatientOption | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<PatientOption[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      )
        setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!query.trim()) {
      setOptions([]);
      return;
    }
    timerRef.current = setTimeout(async () => {
      const data = await apiClient.get<{
        patients: { _id: string; name: string; patientCode?: string }[];
      }>(
        `/api/dashboard/patients?search=${encodeURIComponent(query)}&limit=20`,
      );
      if (data.success) {
        setOptions(
          (data.data.patients ?? []).map((p) => ({
            id: p._id,
            name: p.name,
            code: p.patientCode,
          })),
        );
      }
    }, 250);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query]);

  function openDropdown() {
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function select(p: PatientOption) {
    onChange(p);
    setOpen(false);
    setQuery("");
    setOptions([]);
  }

  return (
    <div ref={containerRef} className="relative flex-1 min-w-0">
      <button
        type="button"
        onClick={openDropdown}
        className="w-full h-9 flex items-center justify-between gap-2 bg-white/10 border border-white/30 rounded-lg px-3 text-sm hover:bg-white/20 transition-colors"
      >
        {value ? (
          <span className="font-medium text-white truncate">
            {value.name}
            {value.code ? (
              <span className="ml-1.5 text-primary-200 font-normal text-xs">
                ({value.code})
              </span>
            ) : null}
          </span>
        ) : (
          <span className="text-primary-200">Search patient…</span>
        )}
        <ChevronDown className="w-4 h-4 text-primary-200 shrink-0" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type patient name…"
                className="w-full h-8 pl-8 pr-3 text-sm text-gray-900 bg-white border border-gray-200 rounded-md outline-none focus:ring-2 focus:ring-primary-500/30"
              />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {query.trim() === "" ? (
              <p className="py-5 text-center text-xs text-gray-400">
                Type a name to search patients
              </p>
            ) : options.length === 0 ? (
              <p className="py-5 text-center text-xs text-gray-400">
                No patients found for &quot;{query}&quot;
              </p>
            ) : (
              options.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onMouseDown={() => select(p)}
                  className={`w-full text-left px-3 py-2.5 border-b border-gray-50 last:border-0 hover:bg-primary-50 transition-colors ${value?.id === p.id ? "bg-primary-50" : ""}`}
                >
                  <span className="text-sm font-medium text-gray-900">
                    {p.name}
                  </span>
                  {p.code && (
                    <span className="ml-2 text-xs text-gray-400">
                      ({p.code})
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
