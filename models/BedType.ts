import mongoose, { Schema, Document } from 'mongoose'

export interface IBedType extends Document {
  tenantId: mongoose.Types.ObjectId
  name: string
  createdAt: Date
}

const BedTypeSchema = new Schema<IBedType>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    name:     { type: String, required: true },
  },
  { timestamps: true }
)

BedTypeSchema.index({ tenantId: 1, name: 1 }, { unique: true })

if (process.env.NODE_ENV !== 'production' && mongoose.models.BedType) {
  delete (mongoose.models as Record<string, unknown>).BedType
}
export default mongoose.model<IBedType>('BedType', BedTypeSchema)
