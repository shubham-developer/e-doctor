import { NextRequest } from 'next/server'
import mongoose from 'mongoose'
import { connectDB } from '@/lib/db'
import OpdVisit from '@/models/OpdVisit'
import PharmacyBill from '@/models/PharmacyBill'
import Patient from '@/models/Patient'
import Staff from '@/models/Staff'
import { apiResponse, apiError } from '@/lib/api'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export async function GET(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id')
  if (!tenantId) return apiError('Unauthorized', 401)

  await connectDB()

  const tid = new mongoose.Types.ObjectId(tenantId)
  const yearStart = new Date(new Date().getFullYear(), 0, 1)

  const [opdMonthly, pharMonthly, totalPatients, totalStaff] = await Promise.all([
    OpdVisit.aggregate([
      { $match: { tenantId: tid, createdAt: { $gte: yearStart } } },
      { $group: { _id: { $month: '$createdAt' }, total: { $sum: '$paidAmount' } } },
    ]),
    PharmacyBill.aggregate([
      { $match: { tenantId: tid, createdAt: { $gte: yearStart } } },
      { $group: { _id: { $month: '$createdAt' }, total: { $sum: '$netAmount' } } },
    ]),
    Patient.countDocuments({ tenantId }),
    Staff.countDocuments({ tenantId, status: 'active' }),
  ])

  const opdByMonth  = Array<number>(12).fill(0)
  const pharByMonth = Array<number>(12).fill(0)
  for (const r of opdMonthly)  opdByMonth[r._id - 1]  = Math.round(r.total * 100) / 100
  for (const r of pharMonthly) pharByMonth[r._id - 1] = Math.round(r.total * 100) / 100

  const monthly = MONTHS.map((month, i) => ({
    month,
    income:   Math.round((opdByMonth[i] + pharByMonth[i]) * 100) / 100,
    expenses: 0,
  }))

  const opdTotal  = opdByMonth.reduce((a, b)  => a + b, 0)
  const pharTotal = pharByMonth.reduce((a, b) => a + b, 0)

  return apiResponse({
    income: {
      opd:       Math.round(opdTotal  * 100) / 100,
      ipd:       0,
      pharmacy:  Math.round(pharTotal * 100) / 100,
      pathology: 0,
      radiology: 0,
      bloodBank: 0,
      ambulance: 0,
      general:   0,
    },
    expenses: 0,
    monthly,
    totalPatients,
    totalStaff,
  })
}
