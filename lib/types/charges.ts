export interface MasterItem {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
}

export interface ChargeCategoryItem extends MasterItem {
  chargeTypeId?: string | null;
  chargeTypeName?: string | null;
  appliesTo: string[];
}

export interface ChargeTypeItem {
  _id: string;
  name: string;
  applicableModules: string[];
  isActive: boolean;
  sortOrder: number;
}

export interface TaxCategoryItem extends MasterItem {
  percent: number;
}

export interface Charge {
  _id: string;
  name: string;
  standardCharge: number;
  isActive: boolean;
  chargeCategoryId?: string | null;
  chargeCategoryName?: string | null;
  chargeTypeName?: string | null;
  unitTypeId?: string | null;
  unitTypeName?: string | null;
  taxCategoryId?: string | null;
  taxCategoryName?: string | null;
  taxPercent?: number | null;
}

/** Minimal shape used by OPD/IPD/Patients billing pickers. */
export interface ChargeLookup {
  _id: string;
  name: string;
  standardCharge: number;
  taxPercent?: number | null;
  isActive: boolean;
}
