"use client";

import { User, Shield } from "lucide-react";
import type { StaffMember } from "./types";

export function StaffCard({
  member,
  onClick,
}: {
  member: StaffMember;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="bg-white border border-gray-200 rounded-lg p-4 flex gap-4 hover:border-primary-300 hover:shadow-sm transition-all cursor-pointer"
    >
      <div className="w-20 h-20 shrink-0 rounded bg-gray-100 overflow-hidden flex items-center justify-center">
        {member.photoUrl ? (
          <img
            src={member.photoUrl}
            alt={member.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <User className="w-8 h-8 text-gray-300" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-gray-900 text-sm leading-tight">
          {member.name}
        </p>
        <p className="text-gray-500 text-xs mt-0.5">{member.staffCode}</p>
        {member.phone && (
          <p className="text-gray-500 text-xs">{member.phone}</p>
        )}
        {(member.floor || member.department) && (
          <p className="text-gray-400 text-xs mt-0.5 truncate">
            {[member.floor, member.department].filter(Boolean).join(", ")}
          </p>
        )}
        <div className="flex flex-wrap gap-1 mt-2">
          {member.customRoleId ? (
            <span className="text-xs bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.5 rounded flex items-center gap-0.5">
              <Shield className="w-2.5 h-2.5" />
              {member.customRoleId.name}
            </span>
          ) : (
            <span className="text-xs border border-gray-300 text-gray-600 px-1.5 py-0.5 rounded">
              {member.role}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
