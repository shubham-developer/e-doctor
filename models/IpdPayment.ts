import mongoose, { Schema, Document } from 'mongoose'

export interface IIpdPayment extends Document {
  tenantId:     mongoose.Types.ObjectId
  ipdId:        mongoose.Types.ObjectId
  amount:       number
  paymentMode:  string
  note?:        string
  date:         string
  addedByName?: string
  createdAt:    Date
}

const IpdPaymentSchema = new Schema<IIpdPayment>(
  {
    tenantId:    { type: Schema.Types.ObjectId, required: true, index: true },
    ipdId:       { type: Schema.Types.ObjectId, ref: 'IpdAdmission', required: true, index: true },
    amount:      { type: Number, required: true },
    paymentMode: { type: String, default: 'Cash' },
    note:        { type: String },
    date:        { type: String, required: true },
    addedByName: { type: String },
  },
  { timestamps: true }
)

if (process.env.NODE_ENV !== 'production' && mongoose.models.IpdPayment) {
  delete (mongoose.models as Record<string, unknown>).IpdPayment
}
export default mongoose.model<IIpdPayment>('IpdPayment', IpdPaymentSchema)
