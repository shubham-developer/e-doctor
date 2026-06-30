import mongoose, { Schema, Document } from 'mongoose'

export interface IFloor extends Document {
  tenantId: mongoose.Types.ObjectId
  name: string
  createdAt: Date
}

const FloorSchema = new Schema<IFloor>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    name:     { type: String, required: true },
  },
  { timestamps: true }
)

FloorSchema.index({ tenantId: 1, name: 1 }, { unique: true })

if (process.env.NODE_ENV !== 'production' && mongoose.models.Floor) {
  delete (mongoose.models as Record<string, unknown>).Floor
}
export default mongoose.model<IFloor>('Floor', FloorSchema)
