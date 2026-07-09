import type { IPermissions, IPermEntry } from "@/models/Role";

/** Single source of truth for the standard HMS staff role archetypes,
 * seeded (isSystem: true) into every new tenant. isSystem roles are
 * locked — no rename, no permission edits, no delete — enforced both in
 * the Roles UI and server-side in the roles API routes. */
export interface MasterRoleDef {
  name: string;
  description: string;
  permissions: IPermissions;
}

const full: IPermEntry = { view: true, add: true, edit: true, delete: true };
const view: IPermEntry = { view: true };
const viewAdd: IPermEntry = { view: true, add: true };
const viewEdit: IPermEntry = { view: true, edit: true };
const viewAddEdit: IPermEntry = { view: true, add: true, edit: true };

export const MASTER_ROLES: MasterRoleDef[] = [
  {
    name: "Owner",
    description: "Full access to every module. Reserved for clinic owners.",
    permissions: {
      dashboard: full,
      patients: full,
      settings: full,
      opd: full,
      ipd: full,
      pharmacy: full,
      humanResource: full,
      billing: full,
      reports: full,
      appointment: full,
      pathology: full,
      radiology: full,
      bloodBank: full,
      ambulance: full,
      inventory: full,
    },
  },
  {
    name: "Doctor",
    description:
      "Clinical care: patients, OPD/IPD, appointments, and diagnostic orders.",
    permissions: {
      dashboard: view,
      patients: viewAddEdit,
      opd: viewAddEdit,
      ipd: viewAddEdit,
      appointment: viewAddEdit,
      pathology: viewAdd,
      radiology: viewAdd,
      pharmacy: view,
      reports: view,
      bloodBank: view,
      ambulance: view,
    },
  },
  {
    name: "Nurse",
    description: "Ward care: patient vitals/notes, OPD and IPD support.",
    permissions: {
      dashboard: view,
      patients: viewEdit,
      opd: view,
      ipd: viewEdit,
      appointment: view,
      pathology: view,
      radiology: view,
      pharmacy: view,
    },
  },
  {
    name: "Receptionist",
    description: "Front desk: registration, appointments, and admissions.",
    permissions: {
      dashboard: view,
      patients: viewAddEdit,
      appointment: viewAddEdit,
      opd: viewAdd,
      ipd: viewAdd,
      billing: viewAdd,
    },
  },
  {
    name: "Pharmacist",
    description: "Pharmacy stock, dispensing, and pharmacy billing.",
    permissions: {
      dashboard: view,
      pharmacy: full,
      patients: view,
      billing: viewAdd,
      inventory: view,
    },
  },
  {
    name: "Lab Technician",
    description: "Pathology and radiology order intake and results.",
    permissions: {
      dashboard: view,
      pathology: full,
      radiology: full,
      patients: view,
      billing: viewAdd,
    },
  },
  {
    name: "Accountant",
    description: "Billing, collections, and financial reports.",
    permissions: {
      dashboard: view,
      billing: full,
      reports: viewAddEdit,
      patients: view,
      humanResource: view,
    },
  },
  {
    name: "Viewer",
    description: "Read-only access across clinical and billing modules.",
    permissions: {
      dashboard: view,
      patients: view,
      opd: view,
      ipd: view,
      pharmacy: view,
      billing: view,
      reports: view,
      appointment: view,
      pathology: view,
      radiology: view,
      bloodBank: view,
      ambulance: view,
      inventory: view,
    },
  },
];
