import express from "express"
import {
  createEvent,
  listEvents,
  getEventById,
  updateEvent,
  deleteEvent,
} from "../controllers/eventController.js"
import { protect } from "../middlewares/authMiddleware.js"
import { allowRoles } from "../middlewares/roleMiddleware.js"

const router = express.Router()

// Create event (admin or CR)
router.post("/", protect, allowRoles("admin", "cr"), createEvent)

// List all events (with search, filters, pagination)
router.get("/", protect, listEvents)

// Get single event by ID
router.get("/:id", protect, getEventById)

// Update event
router.put("/:id", protect, allowRoles("admin", "cr"), updateEvent)

// Delete event
router.delete("/:id", protect, allowRoles("admin", "cr"), deleteEvent)

export default router
