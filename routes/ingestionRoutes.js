import express from "express"
import { scheduleQueue, eventQueue, resultQueue, generalInfoQueue } from "../services/backgroundIngestionService.js"

const router = express.Router()

router.get("/status", async (req, res) => {
  try {
    const scheduleStats = await scheduleQueue.getJobCounts()
    const eventStats = await eventQueue.getJobCounts()
    const resultStats = await resultQueue.getJobCounts()
    const generalInfoStats = await generalInfoQueue.getJobCounts()

    res.json({
      schedule: scheduleStats,
      event: eventStats,
      result: resultStats,
      generalInfo: generalInfoStats,
      timestamp: new Date(),
    })
  } catch (error) {
    console.error("[IngestionRoutes] Status error:", error.message)
    res.status(500).json({ error: error.message })
  }
})

router.get("/pending", async (req, res) => {
  try {
    const scheduleCounts = await scheduleQueue.getJobCounts()
    const eventCounts = await eventQueue.getJobCounts()
    const resultCounts = await resultQueue.getJobCounts()
    const generalInfoCounts = await generalInfoQueue.getJobCounts()

    const total =
      (scheduleCounts.pending || 0) +
      (eventCounts.pending || 0) +
      (resultCounts.pending || 0) +
      (generalInfoCounts.pending || 0)

    res.json({
      schedule: scheduleCounts.pending || 0,
      event: eventCounts.pending || 0,
      result: resultCounts.pending || 0,
      generalInfo: generalInfoCounts.pending || 0,
      total: total,
    })
  } catch (error) {
    console.error("[IngestionRoutes] Pending error:", error.message)
    res.status(500).json({ error: error.message })
  }
})

router.get("/stats", async (req, res) => {
  try {
    const stats = {
      schedule: await scheduleQueue.getJobCounts(),
      event: await eventQueue.getJobCounts(),
      result: await resultQueue.getJobCounts(),
      generalInfo: await generalInfoQueue.getJobCounts(),
      timestamp: new Date(),
    }

    res.json(stats)
  } catch (error) {
    console.error("[IngestionRoutes] Stats error:", error.message)
    res.status(500).json({ error: error.message })
  }
})

export default router
