import mongoose, { Schema, Document } from 'mongoose'

export interface IPermEntry {
  view?: boolean
  add?: boolean
  edit?: boolean
  delete?: boolean
}

// { moduleKey: { featureKey: { view, add, edit, delete } } }
export type IPermissions = Record<string, Record<string, IPermEntry>>

export interface IRole extends Document {
  tenantId: mongoose.Types.ObjectId
  name: string
  description?: string
  isSystem: boolean
  permissions: IPermissions
  createdAt: Date
}

const RoleSchema = new Schema<IRole>(
  {
    tenantId:    { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    name:        { type: String, required: true },
    description: { type: String },
    isSystem:    { type: Boolean, default: false },
    permissions: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
)

RoleSchema.index({ tenantId: 1, name: 1 }, { unique: true })

export default mongoose.models.Role || mongoose.model<IRole>('Role', RoleSchema)
