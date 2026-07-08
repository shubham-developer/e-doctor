import { DepartmentSetupTab } from "@/components/settings/DepartmentSetupTab";

export const metadata = { title: "Departments" };

export default function DepartmentsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-gray-800">Departments</h1>
      <DepartmentSetupTab />
    </div>
  );
}
