import { TpaSetupTab } from "@/components/settings/TpaSetupTab";

export const metadata = { title: "TPA Companies" };

export default function TpaSettingsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-gray-800">TPA / Insurance Companies</h1>
      <TpaSetupTab />
    </div>
  );
}
