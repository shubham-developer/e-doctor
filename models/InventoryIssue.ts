import mongoose, { Schema, Document } from 'mongoose'

export interface IssueLineItem {
  itemId: mongoose.Types.ObjectId
  itemName: string
  quantity: number
  unitCost: number
  totalCost: number
}

export interface IInventoryIssue extends Document {
  tenantId: mongoose.Types.ObjectId
  department: string
  issuedTo: string
  issueDate: Date
  items: IssueLineItem[]
  totalAmount: number
  purpose: string
  notes: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

const IssueLineItemSchema = new Schema<IssueLineItem>(
  {
    itemId:    { type: Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
    itemName:  { type: String, required: true },
    quantity:  { type: Number, required: true },
    unitCost:  { type: Number, required: true },
    totalCost: { type: Number, required: true },
  },
  { _id: false }
)

const InventoryIssueSchema = new Schema<IInventoryIssue>(
  {
    tenantId:    { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    department:  { type: String, default: '' },
    issuedTo:    { type: String, default: '' },
    issueDate:   { type: Date, required: true },
    items:       { type: [IssueLineItemSchema], default: [] },
    totalAmount: { type: Number, default: 0 },
    purpose:     { type: String, default: '' },
    notes:       { type: String, default: '' },
    createdBy:   { type: String, default: '' },
  },
  { timestamps: true }
)

InventoryIssueSchema.index({ tenantId: 1, issueDate: -1 })

if (process.env.NODE_ENV !== 'production' && mongoose.models.InventoryIssue) {
  delete mongoose.models.InventoryIssue
}

export default mongoose.models.InventoryIssue ||
  mongoose.model<IInventoryIssue>('InventoryIssue', InventoryIssueSchema)
