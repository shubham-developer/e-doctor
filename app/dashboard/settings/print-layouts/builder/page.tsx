"use client";

import { useSearchParams } from "next/navigation";
import { PrintTemplateBuilder } from "@/components/settings/print-builder/PrintTemplateBuilder";
import { PRINT_DOCUMENT_KEYS, type PrintDocumentKey } from "@/lib/print/customTemplate";

export default function PrintLayoutBuilderPage() {
  const searchParams = useSearchParams();
  const document = searchParams.get("document");
  const documentKey = PRINT_DOCUMENT_KEYS.includes(document as PrintDocumentKey)
    ? (document as PrintDocumentKey)
    : null;

  if (!documentKey) {
    return (
      <p className="text-sm text-gray-500">
        Unknown document — go back to Settings → Print Layouts and choose
        &quot;Open Builder&quot; again.
      </p>
    );
  }

  return <PrintTemplateBuilder documentKey={documentKey} />;
}
