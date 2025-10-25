import fs from "fs"
import path from "path"

/**
 * Initialize quota tracker file if it doesn't exist
 * This ensures the quota tracking system works properly
 */
export function initializeQuotaTracker() {
  const quotaFilePath = path.join(process.cwd(), ".quota-tracker.json")

  try {
    // Check if file exists
    if (!fs.existsSync(quotaFilePath)) {
      const today = new Date().toISOString().split("T")[0]
      const initialData = {
        date: today,
        count: 0,
        lastReset: new Date().toISOString(),
        notes: "Quota tracker initialized",
      }

      fs.writeFileSync(quotaFilePath, JSON.stringify(initialData, null, 2))
      console.log("[QuotaInitializer] Created quota tracker file:", quotaFilePath)
      return initialData
    }

    // File exists, verify it's valid JSON
    const data = JSON.parse(fs.readFileSync(quotaFilePath, "utf-8"))
    const today = new Date().toISOString().split("T")[0]

    // Reset if it's a new day
    if (data.date !== today) {
      const resetData = {
        date: today,
        count: 0,
        lastReset: new Date().toISOString(),
        notes: "Quota reset for new day",
      }
      fs.writeFileSync(quotaFilePath, JSON.stringify(resetData, null, 2))
      console.log("[QuotaInitializer] Quota reset for new day")
      return resetData
    }

    console.log(`[QuotaInitializer] Quota tracker loaded: ${data.count}/1500 requests used today`)
    return data
  } catch (error) {
    console.error("[QuotaInitializer] Error initializing quota tracker:", error.message)
    // Return default data if initialization fails
    return {
      date: new Date().toISOString().split("T")[0],
      count: 0,
      lastReset: new Date().toISOString(),
    }
  }
}

/**
 * Check if quota is exceeded
 */
export function isQuotaExceeded() {
  try {
    const quotaFilePath = path.join(process.cwd(), ".quota-tracker.json")
    if (fs.existsSync(quotaFilePath)) {
      const data = JSON.parse(fs.readFileSync(quotaFilePath, "utf-8"))
      return data.count >= 1500
    }
  } catch (error) {
    console.warn("[QuotaInitializer] Could not check quota:", error.message)
  }
  return false
}

/**
 * Get current quota usage
 */
export function getQuotaUsage() {
  try {
    const quotaFilePath = path.join(process.cwd(), ".quota-tracker.json")
    if (fs.existsSync(quotaFilePath)) {
      const data = JSON.parse(fs.readFileSync(quotaFilePath, "utf-8"))
      return {
        used: data.count,
        limit: 1500,
        percentage: Math.round((data.count / 1500) * 100),
        remaining: Math.max(0, 1500 - data.count),
        date: data.date,
      }
    }
  } catch (error) {
    console.warn("[QuotaInitializer] Could not get quota usage:", error.message)
  }
  return {
    used: 0,
    limit: 1500,
    percentage: 0,
    remaining: 1500,
    date: new Date().toISOString().split("T")[0],
  }
}
