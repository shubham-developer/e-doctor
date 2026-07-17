import { BranchesTab } from "@/components/settings/BranchesTab";

export const metadata = { title: "Branches" };

export default function BranchesSettingsPage() {
  return (
    <div className="space-y-4">
      <BranchesTab />
    </div>
  );
}
