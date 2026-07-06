"use client";

import { useState, useRef } from "react";
import { useApp } from "@/lib/context";
import { Send, Trash2, Clock, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/apiClient";
import { useApiQuery } from "@/lib/useApiQuery";

interface NurseNote {
  _id: string;
  note: string;
  addedByName: string;
  addedByRole: string;
  createdAt: string;
}

export function NurseNotesTab({ patientId }: { patientId: string }) {
  const { user } = useApp();
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    data: notesData,
    isPending: loading,
    refetch: refetchNotes,
  } = useApiQuery<NurseNote[]>(
    ["nurse-notes", patientId],
    `/api/dashboard/nurse-notes?patientId=${patientId}&limit=100`,
  );
  const notes = notesData ?? [];

  async function handleSave() {
    if (!text.trim()) return;
    setSaving(true);
    try {
      const res = await apiClient.post<NurseNote>(
        "/api/dashboard/nurse-notes",
        { patientId, note: text.trim() },
      );
      if (res.success) {
        refetchNotes();
        setText("");
        textareaRef.current?.focus();
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this note?")) return;
    const res = await apiClient.delete(`/api/dashboard/nurse-notes/${id}`);
    if (res.success) refetchNotes();
  }

  const canWrite = user?.role !== "VIEWER";

  return (
    <div className="p-4 max-w-2xl mx-auto flex flex-col gap-4">
      {/* Input area */}
      {canWrite && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Add Note
          </p>
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSave();
            }}
            placeholder="Type a clinical observation, instruction, or follow-up note…"
            rows={3}
            className="w-full text-sm border border-gray-200 rounded-lg p-3 resize-none outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition"
          />
          <div className="flex items-center justify-between mt-2">
            <p className="text-2xs text-gray-400">Ctrl+Enter to save</p>
            <Button size="sm" onClick={handleSave} disabled={saving || !text.trim()}>
              <Send className="w-3 h-3" />
              {saving ? "Saving…" : "Save Note"}
            </Button>
          </div>
        </div>
      )}

      {/* Notes history */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          History {!loading && `(${notes.length})`}
        </p>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white border border-gray-200 rounded-xl p-4 animate-pulse"
              >
                <div className="h-3 bg-gray-100 rounded w-32 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-full mb-1" />
                <div className="h-3 bg-gray-100 rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : notes.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl py-12 text-center text-gray-400">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No notes yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notes.map((n) => (
              <div
                key={n._id}
                className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="text-xs font-semibold text-gray-800">
                      {n.addedByName}
                    </span>
                    <span className="ml-2 text-2xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                      {n.addedByRole}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="flex items-center gap-1 text-2xs text-gray-400">
                      <Clock className="w-3 h-3" />
                      {new Date(n.createdAt).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                      })}
                    </span>
                    {canWrite && (
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => handleDelete(n._id)}
                        className="text-gray-300 hover:text-danger-500 hover:bg-danger-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {n.note}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
