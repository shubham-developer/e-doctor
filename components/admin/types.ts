export interface AdminTenant {
  _id: string;
  name: string;
  slug: string;
  address: string;
  plan: "STARTER" | "GROWTH" | "PRO";
  planExpiresAt: string;
  isActive: boolean;
  brandColor: string;
  enabledModules?: string[];
  createdAt: string;
}

export interface AdminTenantListItem {
  _id: string;
  name: string;
  slug: string;
  plan: "STARTER" | "GROWTH" | "PRO";
  isActive: boolean;
  planExpiresAt: string;
  createdAt: string;
  userCount: number;
  appointmentCount: number;
  patientCount: number;
  doctorCount: number;
  staffCount: number;
}

export interface AdminTenantStats {
  total: number;
  active: number;
  inactive: number;
  byPlan: { STARTER: number; GROWTH: number; PRO: number };
}

export interface AdminTenantUser {
  _id: string;
  name: string;
  email: string;
  role: "OWNER" | "RECEPTIONIST" | "VIEWER";
  isActive: boolean;
  createdAt: string;
}
