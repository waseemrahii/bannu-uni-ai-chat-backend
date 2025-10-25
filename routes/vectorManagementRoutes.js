import express from "express"
import VectorDatabaseManager from "../utils/vectorDatabaseManager.js"
import { protect } from "../middlewares/authMiddleware.js"
import { authorize } from "../middlewares/roleMiddleware.js"

const router = express.Router()

// Get comprehensive statistics
router.get("/stats/comprehensive", protect, authorize("admin"), async (req, res) => {
  try {
    const stats = await VectorDatabaseManager.getComprehensiveStats()
    res.status(200).json({
      success: true,
      data: stats,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
})

// Get most accessed documents
router.get("/most-accessed", protect, authorize("admin"), async (req, res) => {
  try {
    const { limit = 10 } = req.query
    const documents = await VectorDatabaseManager.getMostAccessedDocuments(Number.parseInt(limit))
    res.status(200).json({
      success: true,
      data: documents,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
})

// Get recent documents
router.get("/recent", protect, authorize("admin"), async (req, res) => {
  try {
    const { limit = 10 } = req.query
    const documents = await VectorDatabaseManager.getRecentDocuments(Number.parseInt(limit))
    res.status(200).json({
      success: true,
      data: documents,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
})

// Get documents by type
router.get("/by-type/:type", protect, authorize("admin"), async (req, res) => {
  try {
    const { type } = req.params
    const { limit = 20 } = req.query
    const documents = await VectorDatabaseManager.getDocumentsByType(type, Number.parseInt(limit))
    res.status(200).json({
      success: true,
      data: documents,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
})

// Get performance metrics
router.get("/metrics", protect, authorize("admin"), async (req, res) => {
  try {
    const metrics = await VectorDatabaseManager.getPerformanceMetrics()
    res.status(200).json({
      success: true,
      data: metrics,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
})

// Validate database integrity
router.get("/validate", protect, authorize("admin"), async (req, res) => {
  try {
    const validation = await VectorDatabaseManager.validateIntegrity()
    res.status(200).json({
      success: true,
      data: validation,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
})

// Rebuild index for type
router.post("/rebuild/:type", protect, authorize("admin"), async (req, res) => {
  try {
    const { type } = req.params
    const result = await VectorDatabaseManager.rebuildTypeIndex(type)
    res.status(200).json({
      success: true,
      message: `Index rebuilt for type: ${type}`,
      data: result,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
})

// Export documents
router.get("/export", protect, authorize("admin"), async (req, res) => {
  try {
    const { type } = req.query
    const exported = await VectorDatabaseManager.exportDocuments(type)
    res.status(200).json({
      success: true,
      data: exported,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
})

// Delete old documents
router.delete("/cleanup", protect, authorize("admin"), async (req, res) => {
  try {
    const { daysOld = 90 } = req.query
    const result = await VectorDatabaseManager.deleteOldDocuments(Number.parseInt(daysOld))
    res.status(200).json({
      success: true,
      message: `Deleted documents older than ${daysOld} days`,
      data: result,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
})

export default router
