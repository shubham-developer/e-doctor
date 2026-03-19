import mongoose, { Schema, Document } from 'mongoose'

export interface IAdminUser extends Document {
  name: string
  email: string
  passwordHash: string
  createdAt: Date
}

const AdminUserSchema = new Schema<IAdminUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
  },
  { timestamps: true }
)

export default mongoose.models.AdminUser || mongoose.model<IAdminUser>('AdminUser', AdminUserSchema)
