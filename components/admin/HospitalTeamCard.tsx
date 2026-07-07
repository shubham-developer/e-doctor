"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AdminTenantUser } from "./types";

const ROLE_COLOR: Record<string, string> = {
  OWNER: "bg-primary-100 text-primary-700",
  RECEPTIONIST: "bg-primary-100 text-primary-700",
  VIEWER: "bg-gray-100 text-gray-600",
};

interface HospitalTeamCardProps {
  users: AdminTenantUser[];
}

export function HospitalTeamCard({ users }: HospitalTeamCardProps) {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">
          Team Members ({users.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-gray-50">
          {users.map((u) => (
            <div key={u._id} className="flex items-center gap-3 px-6 py-3">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-indigo-100 text-indigo-700 text-xs font-semibold">
                  {u.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {u.name}
                </p>
                <p className="text-xs text-gray-400 truncate">{u.email}</p>
              </div>
              <Badge className={`${ROLE_COLOR[u.role]} border-0 text-xs`}>
                {u.role}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
