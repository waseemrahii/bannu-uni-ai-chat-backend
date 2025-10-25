import express from "express"
import ragService from "../services/ragService.js"
import advancedRAGService from "../services/advancedRAGService.js"
import DocumentIngestionHelper from "../utils/documentIngestionHelper.js"
import { getRAGStatistics } from "../utils/ragAiHelper.js"
import { protect } from "../middlewares/authMiddleware.js"
import { authorize } from "../middlewares/roleMiddleware.js"

const router = express.Router()

// Ingest all documents into vector database
router.post("/ingest/all", protect, authorize("admin"), async (req, res) => {
  try {
    console.log("[Vector Routes] Starting full ingestion")
    const result = await DocumentIngestionHelper.ingestAllDocuments()
    res.status(200).json({
      success: true,
      message: "Documents ingested successfully",
      data: result,
    })
  } catch (error) {
    console.error("[Vector Routes] Ingestion error:", error)
    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
})

// Ingest specific document type
router.post("/ingest/:type", protect, authorize("admin"), async (req, res) => {
  try {
    const { type } = req.params
    let count = 0

    switch (type) {
      case "schedules":
        count = await DocumentIngestionHelper.ingestAllSchedules()
        break
      case "events":
        count = await DocumentIngestionHelper.ingestAllEvents()
        break
      case "results":
        count = await DocumentIngestionHelper.ingestAllResults()
        break
      case "general-info":
        count = await DocumentIngestionHelper.ingestAllGeneralInfo()
        break
      default:
        return res.status(400).json({
          success: false,
          message: "Invalid document type",
        })
    }

    res.status(200).json({
      success: true,
      message: `${type} ingested successfully`,
      data: { count },
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
})

// Get vector database statistics
router.get("/stats", protect, authorize("admin"), async (req, res) => {
  try {
    const stats = await getRAGStatistics()
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

// Search documents with RAG
router.post("/search", protect, async (req, res) => {
  try {
    const { query, filters = {}, topK = 5 } = req.body

    if (!query) {
      return res.status(400).json({
        success: false,
        message: "Query is required",
      })
    }

    const results = await advancedRAGService.retrieveWithMultipleStrategies(query, filters, topK)

    res.status(200).json({
      success: true,
      data: {
        query,
        results: results.map((r) => ({
          content: r.content,
          type: r.metadata?.type,
          relevance: r.similarityScore,
          metadata: r.metadata,
        })),
        count: results.length,
      },
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
})

// Generate RAG answer
router.post("/answer", protect, async (req, res) => {
  try {
    const { query, filters = {} } = req.body

    if (!query) {
      return res.status(400).json({
        success: false,
        message: "Query is required",
      })
    }

    const result = await ragService.generateRAGAnswer(query, filters)

    res.status(200).json({
      success: true,
      data: result,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
})

// Clear all vector documents
router.delete("/clear", protect, authorize("admin"), async (req, res) => {
  try {
    const result = await ragService.clearAllDocuments()
    res.status(200).json({
      success: true,
      message: "Vector database cleared",
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
