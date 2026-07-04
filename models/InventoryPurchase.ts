import mongoose, { Schema, Document } from 'mongoose'

export interface PurchaseLineItem {
  itemId: mongoose.Types.ObjectId
  itemName: string
  quantity: number
  unitCost: number
  totalCost: number
}

export interface IInventoryPurchase extends Document {
  tenantId: mongoose.Types.ObjectId
  vendorId?: mongoose.Types.ObjectId
  vendorName: string
  invoiceNumber: string
  purchaseDate: Date
  items: PurchaseLineItem[]
  totalAmount: number
  notes: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

const LineItemSchema = new Schema<PurchaseLineItem>(
  {
    itemId:    { type: Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
    itemName:  { type: String, required: true },
    quantity:  { type: Number, required: true },
    unitCost:  { type: Number, required: true },
    totalCost: { type: Number, required: true },
  },
  { _id: false }
)

const InventoryPurchaseSchema = new Schema<IInventoryPurchase>(
  {
    tenantId:      { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    vendorId:      { type: Schema.Types.ObjectId, ref: 'InventoryVendor' },
    vendorName:    { type: String, default: '' },
    invoiceNumber: { type: String, default: '' },
    purchaseDate:  { type: Date, required: true },
    items:         { type: [LineItemSchema], default: [] },
    totalAmount:   { type: Number, default: 0 },
    notes:         { type: String, default: '' },
    createdBy:     { type: String, default: '' },
  },
  { timestamps: true }
)

InventoryPurchaseSchema.index({ tenantId: 1, purchaseDate: -1 })
InventoryPurchaseSchema.index({ tenantId: 1, vendorId: 1 })

if (process.env.NODE_ENV !== 'production' && mongoose.models.InventoryPurchase) {
  delete mongoose.models.InventoryPurchase
}

export default mongoose.models.InventoryPurchase ||
  mongoose.model<IInventoryPurchase>('InventoryPurchase', InventoryPurchaseSchema)
