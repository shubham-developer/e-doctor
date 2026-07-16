import { UserLogsTab } from "@/components/settings/UserLogsTab";

export const metadata = { title: "User Logs" };

export default function UserLogsPage() {
  return (
    <div className="space-y-4">
      <UserLogsTab />
    </div>
  );
}
