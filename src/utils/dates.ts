const pad = (n: number): string => String(n).padStart(2, '0')

function toLocalIso(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function todayLocalIso(): string {
  return toLocalIso(new Date())
}

export function daysAgoLocalIso(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return toLocalIso(d)
}

export function groupByLocalDay(timestamps: string[]): Map<string, number> {
  const out = new Map<string, number>()
  for (const t of timestamps) {
    const key = toLocalIso(new Date(t))
    out.set(key, (out.get(key) ?? 0) + 1)
  }
  return out
}

export function streakDays(counts: Map<string, number>): number {
  let streak = 0
  const cursor = new Date()
  let allowTodayFreebie = true
  for (let i = 0; i < 365; i++) {
    const key = toLocalIso(cursor)
    const hit = (counts.get(key) ?? 0) >= 1
    if (hit || allowTodayFreebie) {
      streak += 1
      allowTodayFreebie = false
      cursor.setDate(cursor.getDate() - 1)
    } else {
      break
    }
  }
  return streak
}
