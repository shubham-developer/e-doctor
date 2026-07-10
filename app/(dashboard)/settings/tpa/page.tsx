import { TpaSetupTab } from "@/components/settings/TpaSetupTab";

export const metadata = { title: "TPA Companies" };

export default function TpaSettingsPage() {
  return (
    <div className="space-y-4">
      <TpaSetupTab />
    </div>
  );
}
