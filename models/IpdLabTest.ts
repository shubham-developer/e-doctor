import mongoose, { Schema, Document } from 'mongoose'

export interface IIpdLabTest extends Document {
  tenantId:     mongoose.Types.ObjectId
  ipdId:        mongoose.Types.ObjectId
  testId?:      mongoose.Types.ObjectId
  testName:     string
  categoryName?: string
  amount:       number
  date:         string
  note?:        string
  chargeId?:    mongoose.Types.ObjectId
  addedByName?: string
  createdAt:    Date
  updatedAt:    Date
}

const IpdLabTestSchema = new Schema<IIpdLabTest>(
  {
    tenantId:     { type: Schema.Types.ObjectId, required: true, index: true },
    ipdId:        { type: Schema.Types.ObjectId, ref: 'IpdAdmission', required: true, index: true },
    testId:       { type: Schema.Types.ObjectId, ref: 'PathologyTest' },
    testName:     { type: String, required: true },
    categoryName: { type: String },
    amount:       { type: Number, required: true, default: 0 },
    date:         { type: String, default: '' },
    note:         { type: String },
    chargeId:     { type: Schema.Types.ObjectId, ref: 'IpdCharge' },
    addedByName:  { type: String },
  },
  { timestamps: true }
)

if (process.env.NODE_ENV !== 'production' && mongoose.models.IpdLabTest) {
  delete (mongoose.models as Record<string, unknown>).IpdLabTest
}
export default mongoose.model<IIpdLabTest>('IpdLabTest', IpdLabTestSchema)
