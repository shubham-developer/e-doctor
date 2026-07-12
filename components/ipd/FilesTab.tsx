"use client";

import { useRef, useState } from "react";
import { useApiQuery } from "@/lib/useApiQuery";
import { useApp } from "@/lib/context";
import { Button } from "@/components/ui/button";
import {
  Upload,
  FileText,
  File,
  Image,
  Trash2,
  Download,
  Eye,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { toast } from "sonner";

interface IpdFile {
  _id: string;
  filename: string;
  mimeType: string;
  size: number;
  uploadedByName?: string;
  createdAt: string;
}

function fileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return Image;
  if (mimeType === "application/pdf") return FileText;
  return File;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function canPreview(mimeType: string): boolean {
  return mimeType.startsWith("image/") || mimeType === "application/pdf";
}

export function FilesTab({ ipdId }: { ipdId: string }) {
  const { user } = useApp();
  const canWrite = user?.role !== "VIEWER";
  const [uploading, setUploading] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    data: filesData,
    isPending: loading,
    refetch: refetchFiles,
  } = useApiQuery<IpdFile[]>(
    ["ipd-files", ipdId],
    `/api/dashboard/ipd/${ipdId}/files`,
  );
  const files = filesData ?? [];

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!fileInputRef.current) return;
    fileInputRef.current.value = "";
    if (!file) return;

    if (file.size > 100 * 1024 * 1024) {
      toast.error("File too large — maximum 100 MB");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/dashboard/ipd/${ipdId}/files`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        refetchFiles();
        toast.success("File uploaded");
      } else {
        toast.error(data.error ?? "Upload failed");
      }
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(fileId: string, filename: string) {
    if (!confirm(`Delete "${filename}"?`)) return;
    const res = await apiClient.delete(`/api/dashboard/ipd/${ipdId}/files/${fileId}`);
    if (res.success) {
      refetchFiles();
      toast.success("File deleted");
    } else {
      toast.error(res.error ?? "Delete failed");
    }
  }

  async function handleRename(fileId: string) {
    if (!renameValue.trim()) return;
    const res = await apiClient.patch<IpdFile>(
      `/api/dashboard/ipd/${ipdId}/files/${fileId}`,
      { filename: renameValue.trim() },
    );
    if (res.success) {
      refetchFiles();
      setRenamingId(null);
      toast.success("Renamed");
    } else {
      toast.error(res.error ?? "Rename failed");
    }
  }

  function startRename(file: IpdFile) {
    setRenamingId(file._id);
    setRenameValue(file.filename);
  }

  async function openFile(fileId: string, download = false) {
    const res = await apiClient.get<{ url: string }>(
      `/api/dashboard/ipd/${ipdId}/files/${fileId}${download ? "?download=1" : ""}`,
    );
    if (!res.success || !res.data) {
      toast.error(res.error ?? "Could not open file");
      return;
    }
    window.open(res.data.url, "_blank", "noreferrer");
  }

  return (
    <div className="p-4 max-w-3xl mx-auto flex flex-col gap-4">
      {/* Upload area */}
      {canWrite && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full flex flex-col items-center gap-2 border-2 border-dashed border-gray-200 hover:border-primary-400 hover:bg-primary-50 rounded-lg py-8 transition-colors disabled:opacity-60 cursor-pointer"
          >
            <Upload className="w-7 h-7 text-gray-400" />
            <span className="text-sm font-medium text-gray-600">
              {uploading ? "Uploading…" : "Click to upload a file"}
            </span>
            <span className="text-2xs text-gray-400">
              Any file type — max 100 MB
            </span>
          </button>
        </div>
      )}

      {/* File list */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Uploaded Files {!loading && `(${files.length})`}
        </p>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white border border-gray-200 rounded-xl p-4 animate-pulse"
              >
                <div className="h-3 bg-gray-100 rounded w-48 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-24" />
              </div>
            ))}
          </div>
        ) : files.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl py-14 text-center text-gray-400">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No files uploaded yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {files.map((f) => {
              const Icon = fileIcon(f.mimeType);
              const isRenaming = renamingId === f._id;

              return (
                <div
                  key={f._id}
                  className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm flex items-center gap-3"
                >
                  <div className="shrink-0 p-2 bg-gray-50 rounded-lg">
                    <Icon className="w-5 h-5 text-primary-500" />
                  </div>

                  <div className="flex-1 min-w-0">
                    {isRenaming ? (
                      <div className="flex items-center gap-2">
                        <input
                          autoFocus
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleRename(f._id);
                            if (e.key === "Escape") setRenamingId(null);
                          }}
                          className="flex-1 text-sm border border-primary-300 rounded px-2 py-0.5 outline-none focus:ring-2 focus:ring-primary-100"
                        />
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => handleRename(f._id)}
                          className="text-success-600 hover:bg-success-50"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => setRenamingId(null)}
                          className="text-gray-400 hover:bg-gray-100"
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {f.filename}
                      </p>
                    )}
                    <p className="text-2xs text-gray-400 mt-0.5">
                      {formatSize(f.size)}
                      {f.uploadedByName && (
                        <span> · {f.uploadedByName}</span>
                      )}
                      {" · "}
                      {new Date(f.createdAt).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                      })}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {canPreview(f.mimeType) && (
                      <button
                        onClick={() => openFile(f._id)}
                        className="p-1.5 rounded-lg hover:bg-primary-50 text-gray-400 hover:text-primary-600 transition"
                        title="View"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => openFile(f._id, true)}
                      className="p-1.5 rounded-lg hover:bg-primary-50 text-gray-400 hover:text-primary-600 transition"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    {canWrite && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => startRename(f)}
                          className="text-gray-400 hover:text-gray-700 hover:bg-gray-50"
                          title="Rename"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleDelete(f._id, f.filename)}
                          className="text-gray-400 hover:text-danger-600 hover:bg-danger-50"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
