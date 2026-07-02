import { BedSetupTab } from "@/components/settings/BedSetupTab";

export const metadata = { title: "Bed Setup" };

export default function BedSetupPage() {
  return (
    <div className="space-y-4">
      <BedSetupTab />
    </div>
  );
}
