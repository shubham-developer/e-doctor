import mongoose, { Schema, Document } from 'mongoose'

export interface IBedGroup extends Document {
  tenantId: mongoose.Types.ObjectId
  name: string
  floor?: string
  description?: string
  createdAt: Date
}

const BedGroupSchema = new Schema<IBedGroup>(
  {
    tenantId:    { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    name:        { type: String, required: true },
    floor:       { type: String },
    description: { type: String },
  },
  { timestamps: true }
)

BedGroupSchema.index({ tenantId: 1, name: 1 }, { unique: true })

if (process.env.NODE_ENV !== 'production' && mongoose.models.BedGroup) {
  delete (mongoose.models as Record<string, unknown>).BedGroup
}
export default mongoose.model<IBedGroup>('BedGroup', BedGroupSchema)
