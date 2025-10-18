import express from "express"
import { protect } from "../middlewares/authMiddleware.js"
import {
  getDashboardStats,
  getUpcomingItems,
  getAnalytics,
  getRecentActivity,
  getScheduleBreakdown,
  getUserStatistics,
} from "../controllers/dashboardController.js"

const router = express.Router()

// All dashboard routes require authentication
router.use(protect)

// Main dashboard stats
router.get("/stats", getDashboardStats)

// Upcoming schedules and events
router.get("/upcoming", getUpcomingItems)

// Analytics and performance metrics
router.get("/analytics", getAnalytics)

// Recent activity feed
router.get("/activity", getRecentActivity)

// Schedule breakdown by type
router.get("/schedule-breakdown", getScheduleBreakdown)

// User statistics
router.get("/users", getUserStatistics)

export default router
