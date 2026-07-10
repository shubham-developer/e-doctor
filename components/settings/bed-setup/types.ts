export interface BedRecord {
  _id: string;
  name: string;
  bedType: string;
  bedGroup: string;
  floor: string;
  dailyCharge: number;
  status: "available" | "allotted";
}

export interface BedGroupRecord {
  _id: string;
  name: string;
  floor?: string;
  description?: string;
}

export interface RefItem {
  _id: string;
  name: string;
}
