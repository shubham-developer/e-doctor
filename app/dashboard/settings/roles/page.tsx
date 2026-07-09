import { RolesTab } from "@/components/settings/RolesTab";

export const metadata = { title: "Roles" };

export default function RolesPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-gray-800">
        Roles &amp; Permissions
      </h1>
      <RolesTab />
    </div>
  );
}
