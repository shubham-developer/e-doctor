import { AvatarSection } from "@/components/profile/AvatarSection";
import { PasswordSection } from "@/components/profile/PasswordSection";

export const metadata = { title: "My Profile" };

export default function ProfilePage() {
  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-lg font-semibold text-gray-800">My Profile</h1>
      <AvatarSection />
      <PasswordSection />
    </div>
  );
}
