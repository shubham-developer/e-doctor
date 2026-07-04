export interface InventoryCategory {
  _id: string;
  name: string;
  description: string;
  createdAt: string;
}

export interface InventoryVendor {
  _id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  gstin: string;
  createdAt: string;
}

export interface InventoryItem {
  _id: string;
  name: string;
  categoryId: { _id: string; name: string } | string;
  unit: string;
  currentStock: number;
  reorderLevel: number;
  maxStock: number;
  unitCost: number;
  location: string;
  description: string;
  isActive: boolean;
  createdAt: string;
}

export interface PurchaseLineItem {
  itemId: string;
  itemName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export interface InventoryPurchase {
  _id: string;
  vendorId?: string | { _id: string; name: string };
  vendorName: string;
  invoiceNumber: string;
  purchaseDate: string;
  items: PurchaseLineItem[];
  totalAmount: number;
  notes: string;
  createdBy: string;
  createdAt: string;
}

export interface IssueLineItem {
  itemId: string;
  itemName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export interface InventoryIssue {
  _id: string;
  department: string;
  issuedTo: string;
  issueDate: string;
  items: IssueLineItem[];
  totalAmount: number;
  purpose: string;
  notes: string;
  createdBy: string;
  createdAt: string;
}

export interface InventoryStats {
  totalItems: number;
  lowStockItems: number;
  outOfStockItems: number;
  totalCategories: number;
  totalVendors: number;
  monthPurchaseTotal: number;
  monthPurchaseCount: number;
  monthIssueTotal: number;
  monthIssueCount: number;
  totalStockValue: number;
  lowStockList: InventoryItem[];
  recentPurchases: InventoryPurchase[];
  recentIssues: InventoryIssue[];
  categoryBreakdown: {
    _id: string;
    name: string;
    count: number;
    value: number;
  }[];
}
