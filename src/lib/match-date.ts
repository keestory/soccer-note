/** Match DATE columns are local calendar days. A day without a kickoff time
 * remains scheduled throughout that day; no completion status is inferred. */
export function isUpcomingMatchDate(value: string, now = new Date()): boolean {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const today = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-')
    return value >= today
  }
  return new Date(value).getTime() > now.getTime()
}
export function matchCalendarDay(value: string): number {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? Number(value.slice(8, 10)) : new Date(value).getDate()
}
