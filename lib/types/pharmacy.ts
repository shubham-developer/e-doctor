export interface Medicine {
  _id: string;
  name: string;
  category?: string;
  availableQty: number;
  salePrice: number;
  taxPercent: number;
  batchNo?: string;
  expiryDate?: string;
}
