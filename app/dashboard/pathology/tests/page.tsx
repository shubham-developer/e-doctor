"use client";

import { DiagnosticTestsSection } from "@/components/common/DiagnosticTestsSection";

export default function PathologyTestsPage() {
  return (
    <DiagnosticTestsSection
      module="pathology"
      apiBase="/api/dashboard/pathology/tests"
      title="Pathology Test"
      addLabel="Add Pathology Test"
      fileName="pathology-tests"
      emptyText="No pathology tests found. Click '+ Add Pathology Test' to create one."
    />
  );
}
