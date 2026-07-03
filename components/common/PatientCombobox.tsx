"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import type { PatientOption } from "@/lib/types/patient";

export function PatientCombobox({
  value,
  onChange,
}: {
  value: PatientOption | null;
  onChange: (p: PatientOption) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<PatientOption[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!query.trim()) {
      setOptions([]);
      return;
    }
    timerRef.current = setTimeout(async () => {
      const res = await fetch(
        `/api/dashboard/patients?search=${encodeURIComponent(query)}&limit=20`,
      );
      const data = await res.json();
      if (data.success) setOptions(data.data.patients ?? []);
    }, 250);
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
    <div ref={containerRef} className="relative w-full">
      {/* Trigger */}
      <button
        type="button"
        onClick={openDropdown}
        className="w-full h-10 flex items-center justify-between px-3 border border-gray-200 rounded-lg bg-white text-sm hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-colors"
      >
        {value ? (
          <span className="font-medium text-gray-900 truncate">
            {value.name}
            {value.patientCode ? (
              <span className="ml-1.5 text-gray-400 font-normal text-xs">
                ({value.patientCode})
              </span>
            ) : null}
          </span>
        ) : (
          <span className="text-gray-400">Search patient…</span>
        )}
        <ChevronDown className="w-4 h-4 text-gray-400 shrink-0 ml-2" />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg z-30 overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type patient name…"
                className="w-full h-8 pl-8 pr-3 text-sm rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
              />
            </div>
          </div>
          {/* Options */}
          <div className="max-h-60 overflow-y-auto">
            {query.trim() === "" ? (
              <p className="py-5 text-center text-xs text-gray-400">
                Type a name to search patients
              </p>
            ) : options.length === 0 ? (
              <p className="py-5 text-center text-xs text-gray-400">
                No patients found for "{query}"
              </p>
            ) : (
              options.map((p) => (
                <button
                  key={p._id}
                  type="button"
                  onMouseDown={() => select(p)}
                  className={`w-full text-left px-3 py-2.5 border-b border-gray-50 last:border-0 hover:bg-primary-50 transition-colors ${
                    value?._id === p._id ? "bg-primary-50" : ""
                  }`}
                >
                  <span className="text-sm font-medium text-gray-900">
                    {p.name}
                  </span>
                  {p.patientCode && (
                    <span className="ml-2 text-xs text-gray-400">
                      ({p.patientCode})
                    </span>
                  )}
                  {p.age > 0 && (
                    <span className="ml-2 text-xs text-gray-500">
                      {p.age} yr
                    </span>
                  )}
                  {p.gender && (
                    <span className="ml-1 text-xs text-gray-400">
                      · {p.gender}
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
