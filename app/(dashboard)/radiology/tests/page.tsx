"use client";

import { DiagnosticTestsSection } from "@/components/common/DiagnosticTestsSection";

export default function RadiologyTestsPage() {
  return (
    <DiagnosticTestsSection
      module="radiology"
      apiBase="/api/dashboard/radiology/tests"
      title="Radiology Tests"
      addLabel="Add Radiology Test"
      fileName="radiology-tests"
      emptyText="No radiology tests found. Click '+ Add Radiology Test' to create one."
    />
  );
}
