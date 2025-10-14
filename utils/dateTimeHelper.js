export const detectMessageContext = () => {
  const now = new Date()
  const currentDate = now.toLocaleDateString("en-GB") // DD/MM/YYYY
  const currentTime = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })
  const currentDay = now.toLocaleDateString("en-US", { weekday: 'long' })
  
  return { 
    currentDate, 
    currentTime, 
    currentDay, 
    now,
    hours: now.getHours(),
    minutes: now.getMinutes()
  }
}

export const getTargetDateFromMessage = (message, messageTime = new Date()) => {
  const text = message.toLowerCase()
  const base = new Date(messageTime)

  if (/\btoday\b/.test(text)) return base
  if (/\btomorrow|tmrw|tommorow|tomorow|tommorrow\b/.test(text)) return new Date(base.setDate(base.getDate() + 1))
  if (/\byesterday\b/.test(text)) return new Date(base.setDate(base.getDate() - 1))

  // Specific day name
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
  const found = days.find((d) => text.includes(d))
  if (found) {
    const current = base.getDay()
    const target = days.indexOf(found)
    let diff = target - current
    if (diff < 0) diff += 7 // next same weekday
    const result = new Date(base)
    result.setDate(base.getDate() + diff)
    return result
  }

  return base // default today
}

// ADD THIS FUNCTION - IT'S MISSING!
export const getDateRangeFromMessage = (message, messageTime = new Date()) => {
  const text = message.toLowerCase()
  const base = new Date(messageTime)
  
  // Today
  if (/\btoday\b/.test(text)) {
    const start = new Date(base)
    start.setHours(0, 0, 0, 0)
    const end = new Date(base)
    end.setHours(23, 59, 59, 999)
    return { start, end, type: 'TODAY' }
  }
  
  // Tomorrow
  if (/\btomorrow|tmrw|tommorow|tomorow|tommorrow\b/.test(text)) {
    const start = new Date(base)
    start.setDate(base.getDate() + 1)
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setHours(23, 59, 59, 999)
    return { start, end, type: 'TOMORROW' }
  }
  
  // This week
  if (/\bthis week|week\b/.test(text)) {
    const start = new Date(base)
    start.setHours(0, 0, 0, 0)
    const end = new Date(base)
    end.setDate(base.getDate() + 7)
    end.setHours(23, 59, 59, 999)
    return { start, end, type: 'WEEK' }
  }
  
  // Default to today
  const start = new Date(base)
  start.setHours(0, 0, 0, 0)
  const end = new Date(base)
  end.setHours(23, 59, 59, 999)
  return { start, end, type: 'TODAY' }
}

export const weekdayName = (date = new Date()) => 
  new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(date)

export const parseTimeToMinutes = (time) => {
  if (!time) return null
  let t = time.toLowerCase().replace(/\s+/g, "")
  const am = t.includes("am")
  const pm = t.includes("pm")
  t = t.replace(/am|pm/g, "")
  const [h, m = "0"] = t.split(":").map(Number)
  let hours = h
  if (pm && hours !== 12) hours += 12
  if (am && hours === 12) hours = 0
  return hours * 60 + (m || 0)
}