const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/

export class DateRange {
  readonly startDate: string
  readonly endDate: string

  constructor(startDate: string, endDate: string) {
    if (!DATE_REGEX.test(startDate)) throw new Error(`Invalid startDate format: ${startDate}`)
    if (!DATE_REGEX.test(endDate))   throw new Error(`Invalid endDate format: ${endDate}`)
    if (startDate > endDate)         throw new Error('startDate must not be after endDate')
    this.startDate = startDate
    this.endDate   = endDate
  }

  toFilter(): { startDate: string; endDate: string } {
    return { startDate: this.startDate, endDate: this.endDate }
  }
}
