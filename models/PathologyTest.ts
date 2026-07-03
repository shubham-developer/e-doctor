import mongoose, { Schema, Document } from 'mongoose'

export interface IPathologyParameter {
  name: string
  referenceRange: string
  unit: string
}

export interface IPathologyTest extends Document {
  tenantId: mongoose.Types.ObjectId
  name: string
  shortName: string
  testType?: string
  chargeId?: mongoose.Types.ObjectId
  subCategory?: string
  method?: string
  reportDays: number
  tax: number
  standardCharge: number
  amount: number
  parameters: IPathologyParameter[]
  createdAt: Date
}

const PathologyTestSchema = new Schema<IPathologyTest>(
  {
    tenantId:         { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    name:             { type: String, required: true },
    shortName:        { type: String },
    testType:         { type: String },
    chargeId:         { type: Schema.Types.ObjectId, ref: 'Charge' },
    subCategory:      { type: String },
    method:           { type: String },
    reportDays:       { type: Number, default: 0 },
    tax:              { type: Number, default: 0 },
    standardCharge:   { type: Number, default: 0 },
    amount:           { type: Number, default: 0 },
    parameters: [
      {
        name:           { type: String, required: true },
        referenceRange: { type: String, default: '' },
        unit:           { type: String, default: '' },
      },
    ],
  },
  { timestamps: true }
)

PathologyTestSchema.index({ tenantId: 1 })

if (process.env.NODE_ENV !== 'production' && mongoose.models.PathologyTest) {
  delete (mongoose.models as Record<string, unknown>).PathologyTest
}
export default mongoose.model<IPathologyTest>('PathologyTest', PathologyTestSchema)
