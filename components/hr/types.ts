export interface CustomRole {
  _id: string;
  name: string;
}

export interface StaffMember {
  _id: string;
  staffCode: number;
  name: string;
  phone?: string;
  alternatePhone?: string;
  email?: string;
  role: string;
  customRoleId?: CustomRole | null;
  designation?: string;
  department?: string;
  floor?: string;
  address?: string;
  dateOfBirth?: string;
  dateOfJoining?: string;
  salary?: number;
  photoUrl?: string;
  status: "active" | "inactive";
}
