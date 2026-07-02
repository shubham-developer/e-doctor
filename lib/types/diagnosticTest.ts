/** Shared shape for Pathology/Radiology tests. */
export interface DiagnosticTest {
  _id: string
  name: string
  shortName: string
  testType?: string
  method?: string
  reportDays: number
  tax: number
  standardCharge: number
  amount: number
  chargeId?: string | null
  chargeName?: string | null
}
