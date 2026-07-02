/** Minimal patient shape used by OPD/IPD full-screen "Add" forms' patient picker. */
export interface PatientOption {
  _id: string
  patientCode?: number
  name: string
  age: number
  ageMonths?: number
  ageDays?: number
  gender?: string
  phone?: string
  email?: string
  address?: string
  guardianName?: string
  bloodGroup?: string
  allergies?: string
  remarks?: string
  tpa?: string
  tpaId?: string
  tpaValidity?: string
  nationalId?: string
}
