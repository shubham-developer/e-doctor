export interface AppModule {
  key: string
  label: string
  /** Can have charges attached to it — shown in Charge Type's "Applicable Modules". */
  billable?: boolean
}

/** Single source of truth for module keys/labels — used by Roles permissions and Charge Type applicability. */
export const APP_MODULES: AppModule[] = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'patients', label: 'Patients' },
  { key: 'settings', label: 'Settings' },
  { key: 'opd', label: 'OPD', billable: true },
  { key: 'ipd', label: 'IPD', billable: true },
  { key: 'pharmacy', label: 'Pharmacy' },
  { key: 'humanResource', label: 'Human Resource' },
  { key: 'billing', label: 'Billing' },
  { key: 'appointment', label: 'Appointment' },
  { key: 'pathology', label: 'Pathology', billable: true },
  { key: 'radiology', label: 'Radiology', billable: true },
  { key: 'bloodBank', label: 'Blood Bank', billable: true },
  { key: 'ambulance', label: 'Ambulance', billable: true },
]

export const CHARGE_MODULES = APP_MODULES.filter(m => m.billable)
