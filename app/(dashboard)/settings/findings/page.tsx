import { FindingsTab } from "@/components/settings/findings/FindingsTab";

export const metadata = { title: "Findings" };

export default function FindingsSettingsPage() {
  return (
    <div className="space-y-4">
      <FindingsTab />
    </div>
  );
}
