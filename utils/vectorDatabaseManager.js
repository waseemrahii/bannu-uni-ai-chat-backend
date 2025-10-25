import VectorDocument from "../models/vectorDocumentModel.js"
import ragService from "../services/ragService.js"

/**
 * Vector Database Manager - Utilities for managing vector database
 */
class VectorDatabaseManager {
  /**
   * Get comprehensive statistics
   */
  static async getComprehensiveStats() {
    try {
      const stats = await ragService.getStatistics()
      const totalDocs = await VectorDocument.countDocuments()
      const avgAccessCount = await VectorDocument.aggregate([{ $group: { _id: null, avg: { $avg: "$accessCount" } } }])

      return {
        totalDocuments: totalDocs,
        byType: stats.byType,
        averageAccessCount: avgAccessCount[0]?.avg || 0,
        lastUpdated: new Date(),
      }
    } catch (error) {
      console.error("[VectorDatabaseManager] Error getting stats:", error)
      throw error
    }
  }

  /**
   * Get most accessed documents
   */
  static async getMostAccessedDocuments(limit = 10) {
    try {
      return await VectorDocument.find().sort({ accessCount: -1 }).limit(limit).lean()
    } catch (error) {
      console.error("[VectorDatabaseManager] Error getting most accessed:", error)
      throw error
    }
  }

  /**
   * Get recently added documents
   */
  static async getRecentDocuments(limit = 10) {
    try {
      return await VectorDocument.find().sort({ createdAt: -1 }).limit(limit).lean()
    } catch (error) {
      console.error("[VectorDatabaseManager] Error getting recent:", error)
      throw error
    }
  }

  /**
   * Get documents by type
   */
  static async getDocumentsByType(type, limit = 20) {
    try {
      return await VectorDocument.find({ "metadata.type": type }).limit(limit).lean()
    } catch (error) {
      console.error("[VectorDatabaseManager] Error getting by type:", error)
      throw error
    }
  }

  /**
   * Get documents by semester
   */
  static async getDocumentsBySemester(semester, limit = 20) {
    try {
      return await VectorDocument.find({ "metadata.semester": semester }).limit(limit).lean()
    } catch (error) {
      console.error("[VectorDatabaseManager] Error getting by semester:", error)
      throw error
    }
  }

  /**
   * Delete old documents (cleanup)
   */
  static async deleteOldDocuments(daysOld = 90) {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysOld)

      const result = await VectorDocument.deleteMany({
        createdAt: { $lt: cutoffDate },
      })

      console.log(`[VectorDatabaseManager] Deleted ${result.deletedCount} old documents`)
      return result
    } catch (error) {
      console.error("[VectorDatabaseManager] Error deleting old documents:", error)
      throw error
    }
  }

  /**
   * Rebuild index for a specific type
   */
  static async rebuildTypeIndex(type) {
    try {
      console.log(`[VectorDatabaseManager] Rebuilding index for type: ${type}`)

      // Delete existing documents of this type
      await VectorDocument.deleteMany({ "metadata.type": type })

      // Re-ingest based on type
      const DocumentIngestionHelper = (await import("./documentIngestionHelper.js")).default

      let count = 0
      switch (type) {
        case "schedule":
          count = await DocumentIngestionHelper.ingestAllSchedules()
          break
        case "event":
          count = await DocumentIngestionHelper.ingestAllEvents()
          break
        case "result":
          count = await DocumentIngestionHelper.ingestAllResults()
          break
        case "general_info":
          count = await DocumentIngestionHelper.ingestAllGeneralInfo()
          break
      }

      console.log(`[VectorDatabaseManager] Rebuilt ${count} documents for type: ${type}`)
      return { type, count }
    } catch (error) {
      console.error("[VectorDatabaseManager] Error rebuilding index:", error)
      throw error
    }
  }

  /**
   * Export documents for backup
   */
  static async exportDocuments(type = null) {
    try {
      const query = type ? { "metadata.type": type } : {}
      const documents = await VectorDocument.find(query).lean()

      return {
        exportDate: new Date(),
        count: documents.length,
        type: type || "all",
        documents: documents.map((doc) => ({
          content: doc.content,
          metadata: doc.metadata,
          accessCount: doc.accessCount,
        })),
      }
    } catch (error) {
      console.error("[VectorDatabaseManager] Error exporting documents:", error)
      throw error
    }
  }

  /**
   * Get search performance metrics
   */
  static async getPerformanceMetrics() {
    try {
      const stats = await VectorDocument.aggregate([
        {
          $group: {
            _id: "$metadata.type",
            count: { $sum: 1 },
            avgAccessCount: { $avg: "$accessCount" },
            maxAccessCount: { $max: "$accessCount" },
            minAccessCount: { $min: "$accessCount" },
          },
        },
      ])

      return {
        timestamp: new Date(),
        metrics: stats,
      }
    } catch (error) {
      console.error("[VectorDatabaseManager] Error getting metrics:", error)
      throw error
    }
  }

  /**
   * Validate vector database integrity
   */
  static async validateIntegrity() {
    try {
      const issues = []

      // Check for documents without embeddings
      const noEmbedding = await VectorDocument.countDocuments({
        embedding: { $exists: false },
      })
      if (noEmbedding > 0) {
        issues.push(`${noEmbedding} documents without embeddings`)
      }

      // Check for invalid embedding dimensions
      const invalidDimensions = await VectorDocument.countDocuments({
        $expr: { $ne: [{ $size: "$embedding" }, 768] },
      })
      if (invalidDimensions > 0) {
        issues.push(`${invalidDimensions} documents with invalid embedding dimensions`)
      }

      // Check for documents without metadata
      const noMetadata = await VectorDocument.countDocuments({
        metadata: { $exists: false },
      })
      if (noMetadata > 0) {
        issues.push(`${noMetadata} documents without metadata`)
      }

      return {
        isValid: issues.length === 0,
        issues,
        timestamp: new Date(),
      }
    } catch (error) {
      console.error("[VectorDatabaseManager] Error validating integrity:", error)
      throw error
    }
  }
}

export default VectorDatabaseManager
